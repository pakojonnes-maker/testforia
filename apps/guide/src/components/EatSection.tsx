import React from 'react';
import { getTranslation } from '../lib/i18n';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine_type: string;
  tier: string;
  cover_image: string;
}

interface EatSectionProps {
  restaurants: Restaurant[];
  zoneName: string;
  lang: string;
  onIntent: (type: 'restaurant', id: string, action: string) => void;
}

const MENU_URL = import.meta.env.VITE_MENU_URL || 'https://menu.visualtastes.com';

export default function EatSection({ restaurants, zoneName, lang, onIntent }: EatSectionProps) {
  if (restaurants.length === 0) {
    return (
      <div className="section-container" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--gris-medio)' }}>
        <span className="material-icons-round" style={{ fontSize: 48, opacity: 0.3 }}>restaurant</span>
        <p style={{ marginTop: 8 }}>{getTranslation('no_info', lang)}</p>
      </div>
    );
  }

  return (
    <div className="section-container" style={{ background: 'var(--arena-dorada)', borderRadius: 'var(--r-xl)', margin: 'var(--sp-md)' }}>
      <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="material-icons-round" style={{ color: 'var(--terracota)', fontSize: '28px' }}>restaurant_menu</span>
        <h2 className="serif section-title" style={{ marginBottom: 0, color: 'var(--terracota)' }}>
          {getTranslation('where_to_eat', lang)} {zoneName}
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-sm)' }}>
        {restaurants.map(r => (
          <a
            key={r.id}
            href={`${MENU_URL}/${r.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onIntent('restaurant', r.id, 'click_menu')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-sm)',
              background: 'var(--blanco-puro)',
              borderRadius: 'var(--r-md)',
              padding: '10px',
              boxShadow: 'var(--sh-sm)',
              border: '1px solid var(--gris-suave)',
              transition: 'transform 0.2s',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: 'var(--r-sm)', flexShrink: 0,
              background: r.cover_image ? `url(${r.cover_image}) center/cover` : 'var(--terracota-suave)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {!r.cover_image && <span className="material-icons-round" style={{ color: 'var(--terracota)', opacity: 0.5 }}>restaurant</span>}
            </div>
            
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--negro-suave)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.name}
              </div>
              {r.cuisine_type && (
                <div style={{ fontSize: '0.8rem', color: 'var(--gris-texto)', marginTop: '2px' }}>
                  {r.cuisine_type}
                </div>
              )}
              {r.tier === 'featured' && (
                <div style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px',
                  background: 'var(--mar-espuma)', color: 'var(--brand-primary)', 
                  padding: '2px 8px', borderRadius: 'var(--r-pill)', fontSize: '0.65rem', fontWeight: 700
                }}>
                  <span style={{ fontSize: '10px' }}>⭐</span> {getTranslation('recommended', lang)}
                </div>
              )}
            </div>

            <div style={{ padding: '0 8px', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center' }}>
              <span className="material-icons-round">chevron_right</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
