import React from 'react';
import CTAButton from './CTAButton';
import { getTranslation } from '../lib/i18n';

interface Experience {
  id: string;
  name: string;
  description: string;
  category: string;
  service_subcategory: string | null;
  action_type: string;
  action_data: string;
  prefilled_message: string;
  price_display: string;
  is_featured: boolean;
  cta_label?: string;
  cover_image_url?: string;
}

interface ServicesSectionProps {
  experiences: Experience[];
  zoneName: string;
  lang: string;
  onIntent: (type: 'experience', id: string, action: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  nautical: '🛥️ Náutica',
  gastro: '👨‍🍳 Gastronomía',
  beauty: '💅 Belleza & Bienestar',
  transport: '🚗 Transporte',
  adventure: '🏄 Aventura',
  other: '✨ Otros Servicios'
};

export default function ServicesSection({ experiences, zoneName, lang, onIntent }: ServicesSectionProps) {
  if (experiences.length === 0) {
    return (
      <div className="section-container" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--gris-medio)' }}>
        <span className="material-icons-round" style={{ fontSize: 48, opacity: 0.3 }}>star</span>
        <p style={{ marginTop: 8 }}>{getTranslation('no_info', lang)}</p>
      </div>
    );
  }

  // Featured experiences
  const featured = experiences.filter(e => e.is_featured);
  
  // Group by category (from service_subcategory if available, else fallback)
  const grouped = experiences.filter(e => !e.is_featured).reduce((acc, exp) => {
    let groupKey = 'other';
    if (exp.service_subcategory) {
      groupKey = exp.service_subcategory.split('/')[0];
    } else if (exp.category) {
      groupKey = exp.category;
    }
    
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(exp);
    return acc;
  }, {} as Record<string, Experience[]>);

  return (
    <div className="section-container">
      <div className="section-header">
        <h2 className="serif section-title" style={{ color: 'var(--brand-secondary)' }}>
          {getTranslation('activities', lang)}
        </h2>
      </div>

      {featured.length > 0 && (
        <div style={{ marginBottom: 'var(--sp-xl)' }}>
          {featured.map(exp => (
            <div key={exp.id} style={{
              background: 'var(--blanco-puro)',
              borderRadius: 'var(--r-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--sh-lg)',
              border: '2px solid var(--oro)',
              marginBottom: 'var(--sp-md)'
            }}>
              {exp.cover_image_url && (
                <div style={{ height: '200px', width: '100%' }}>
                  <img src={exp.cover_image_url} alt={exp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ padding: 'var(--sp-md)' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: 'var(--oro)', color: '#fff',
                  padding: '4px 10px', borderRadius: 'var(--r-pill)',
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                  marginBottom: '12px'
                }}>
                  <span className="material-icons-round" style={{ fontSize: '14px' }}>star</span>
                  {getTranslation('popular', lang)}
                </div>
                
                <h3 className="serif" style={{ fontSize: '1.4rem', color: 'var(--negro-suave)', marginBottom: '8px' }}>
                  {exp.name}
                </h3>
                
                {exp.price_display && (
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '12px' }}>
                    {exp.price_display}
                  </div>
                )}
                
                <p style={{ fontSize: '0.9rem', color: 'var(--gris-texto)', lineHeight: 1.6, marginBottom: '20px' }}>
                  {exp.description}
                </p>
                
                <CTAButton experience={exp} lang={lang} onIntent={(action) => onIntent('experience', exp.id, action)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.entries(grouped).map(([catKey, exps]) => (
        <div key={catKey} style={{ marginBottom: 'var(--sp-xl)' }}>
          <h3 style={{ 
            fontSize: '1.1rem', fontWeight: 700, color: 'var(--brand-secondary)', 
            marginBottom: 'var(--sp-md)', paddingBottom: '8px', borderBottom: '1px solid var(--gris-suave)' 
          }}>
            {CATEGORY_LABELS[catKey] || catKey.charAt(0).toUpperCase() + catKey.slice(1)}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--sp-md)' }}>
            {exps.map(exp => (
              <div key={exp.id} style={{
                background: 'var(--blanco-puro)',
                borderRadius: 'var(--r-lg)',
                padding: 'var(--sp-md)',
                boxShadow: 'var(--sh-sm)',
                border: '1px solid var(--gris-suave)',
                display: 'flex', flexDirection: 'column'
              }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--negro-suave)', marginBottom: '6px' }}>
                  {exp.name}
                </h4>
                {exp.price_display && (
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '8px' }}>
                    {exp.price_display}
                  </div>
                )}
                <p style={{ fontSize: '0.85rem', color: 'var(--gris-texto)', lineHeight: 1.5, marginBottom: '16px', flex: 1 }}>
                  {exp.description}
                </p>
                <CTAButton experience={exp} lang={lang} onIntent={(action) => onIntent('experience', exp.id, action)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
