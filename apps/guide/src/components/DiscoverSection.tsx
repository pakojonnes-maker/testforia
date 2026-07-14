import React, { useState } from 'react';
import { getTranslation } from '../lib/i18n';

interface POI {
  id: string;
  name: string;
  description: string;
  category: string;
  google_maps_url: string;
  media: any[];
}

interface DiscoverSectionProps {
  pois: POI[];
  zoneName: string;
  zoneDescription?: string;
  lang: string;
  onIntent: (type: 'experience', id: string, action: string) => void;
}

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  es: { viewpoint: 'Mirador', beach: 'Playa', monument: 'Monumento', park: 'Parque', water_sport: 'Acuático', adventure: 'Aventura', class: 'Clase' },
  en: { viewpoint: 'Viewpoint', beach: 'Beach', monument: 'Monument', park: 'Park', water_sport: 'Water Sport', adventure: 'Adventure', class: 'Class' },
};

export default function DiscoverSection({ pois, zoneName, zoneDescription, lang, onIntent }: DiscoverSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const getCategoryLabel = (cat: string) => {
    return CATEGORY_LABELS[lang]?.[cat] || CATEGORY_LABELS['en']?.[cat] || cat;
  };

  const categories = Array.from(new Set(pois.map(p => p.category)));

  const filteredPois = activeCategory ? pois.filter(p => p.category === activeCategory) : pois;

  return (
    <div className="section-container">
      <div className="section-header">
        <h2 className="serif section-title">
          {getTranslation('explore_zone', lang)} {zoneName}
        </h2>
        {zoneDescription && (
          <p className="section-subtitle">{zoneDescription}</p>
        )}
      </div>

      {categories.length > 1 && (
        <div style={{
          display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', marginBottom: '8px'
        }}>
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              padding: '6px 14px', borderRadius: 'var(--r-pill)', fontSize: '0.8rem', fontWeight: 600,
              background: activeCategory === null ? 'var(--brand-primary)' : 'var(--blanco-puro)',
              color: activeCategory === null ? '#fff' : 'var(--gris-texto)',
              border: '1px solid var(--gris-suave)', whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--r-pill)', fontSize: '0.8rem', fontWeight: 600,
                background: activeCategory === cat ? 'var(--brand-primary)' : 'var(--blanco-puro)',
                color: activeCategory === cat ? '#fff' : 'var(--gris-texto)',
                border: '1px solid var(--gris-suave)', whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 'var(--sp-md)'
      }}>
        {filteredPois.map(poi => (
          <div key={poi.id} style={{
            background: 'var(--blanco-puro)',
            borderRadius: 'var(--r-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--sh-md)',
            border: '1px solid var(--gris-suave)',
            transition: 'transform 0.2s',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ position: 'relative', height: '180px', background: 'var(--mar-espuma)' }}>
              {poi.media?.[0] ? (
                poi.media[0].type === 'video' ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <video src={poi.media[0].url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted loop playsInline autoPlay />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                      <span className="material-icons-round" style={{ color: '#fff', fontSize: '40px', opacity: 0.8 }}>play_circle_outline</span>
                    </div>
                  </div>
                ) : (
                  <img src={poi.media[0].url} alt={poi.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-icons-round" style={{ fontSize: 48, color: 'var(--brand-primary)', opacity: 0.2 }}>photo_camera</span>
                </div>
              )}
              <div style={{
                position: 'absolute', top: '12px', left: '12px',
                padding: '4px 10px', borderRadius: 'var(--r-pill)',
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                background: 'rgba(255,255,255,0.9)', color: 'var(--brand-secondary)', backdropFilter: 'blur(4px)'
              }}>
                {getCategoryLabel(poi.category)}
              </div>
            </div>
            
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <h3 className="serif" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--negro-suave)', marginBottom: '8px' }}>
                {poi.name}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.5, marginBottom: '16px', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {poi.description}
              </p>
              
              {poi.google_maps_url && (
                <a
                  href={poi.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onIntent('experience', poi.id, 'click_directions')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '10px 16px', borderRadius: 'var(--r-pill)',
                    fontSize: '0.8rem', fontWeight: 600,
                    background: 'var(--brand-primary)', color: '#fff',
                    transition: 'background 0.2s', width: '100%'
                  }}
                >
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>directions</span>
                  {getTranslation('directions', lang)}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
