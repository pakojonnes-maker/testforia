import React, { useState } from 'react';

interface WelcomeHeroProps {
  apartmentName: string;
  address?: string;
  coverImageUrl?: string;
  agencyLogoUrl?: string;
  agencyName?: string;
  currentLang: string;
  onLanguageChange: (lang: string) => void;
  brandPrimaryColor?: string;
}

const LANG_FLAGS: Record<string, string> = {
  es: '🇪🇸', en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', pt: '🇵🇹',
  nl: '🇳🇱', ru: '🇷🇺', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', ar: '🇸🇦',
};

export default function WelcomeHero({
  apartmentName,
  address,
  coverImageUrl,
  agencyLogoUrl,
  agencyName,
  currentLang,
  onLanguageChange,
  brandPrimaryColor
}: WelcomeHeroProps) {
  const [showLangMenu, setShowLangMenu] = useState(false);

  const toggleLangMenu = () => setShowLangMenu(!showLangMenu);

  const handleLangSelect = (lang: string) => {
    onLanguageChange(lang);
    setShowLangMenu(false);
  };

  const bgStyle = coverImageUrl 
    ? { backgroundImage: `linear-gradient(to bottom, rgba(11, 61, 107, 0.4), rgba(11, 61, 107, 0.8)), url(${coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: brandPrimaryColor ? `linear-gradient(135deg, ${brandPrimaryColor}, var(--brand-secondary))` : 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))' };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <header style={{
        ...bgStyle,
        minHeight: '300px',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top bar with Agency and Language Selector */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}>
          {/* Agency */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {agencyLogoUrl && (
              <img 
                src={agencyLogoUrl} 
                alt={agencyName || "Agency"} 
                style={{ width: 32, height: 32, borderRadius: '6px', objectFit: 'contain', background: '#fff', padding: '2px' }} 
              />
            )}
            {agencyName && <span style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{agencyName}</span>}
          </div>

          {/* Language Selector Trigger */}
          <button 
            onClick={toggleLangMenu}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              padding: '6px 12px', borderRadius: 'var(--r-pill)',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
              fontSize: '0.8rem', fontWeight: 600
            }}>
            <span>{LANG_FLAGS[currentLang] || '🌐'}</span>
            <span style={{ textTransform: 'uppercase' }}>{currentLang}</span>
            <span className="material-icons-round" style={{ fontSize: '14px' }}>expand_more</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 5 }}>
          <h1 className="serif" style={{ fontSize: '2.2rem', lineHeight: 1.1, marginBottom: '8px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {apartmentName}
          </h1>
          {address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              <span className="material-icons-round" style={{ fontSize: '16px' }}>location_on</span>
              <span style={{ fontSize: '0.85rem' }}>{address}</span>
            </div>
          )}
        </div>
      </header>

      {/* Language Menu Drawer (simplified for now) */}
      {showLangMenu && (
        <div style={{
          position: 'absolute', top: '70px', right: '20px',
          background: '#fff', borderRadius: 'var(--r-md)',
          boxShadow: 'var(--sh-lg)', zIndex: 20, overflow: 'hidden',
          minWidth: '150px'
        }}>
          {Object.entries(LANG_FLAGS).map(([code, flag]) => (
            <button 
              key={code}
              onClick={() => handleLangSelect(code)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '12px 16px', fontSize: '0.9rem',
                background: currentLang === code ? 'var(--mar-espuma)' : 'transparent',
                color: currentLang === code ? 'var(--brand-primary)' : 'var(--negro-suave)',
                borderBottom: '1px solid var(--gris-suave)',
                fontWeight: currentLang === code ? 600 : 400
              }}>
              <span style={{ marginRight: '8px' }}>{flag}</span>
              <span style={{ textTransform: 'uppercase' }}>{code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
