import React, { useState } from 'react';
import { getTranslation } from '../lib/i18n';

interface InfoItem {
  id: string;
  key: string;
  icon: string;
  title: string;
  content: string;
  media: any[];
}

interface InfoSectionProps {
  infoItems: InfoItem[];
  lang: string;
}

export default function InfoSection({ infoItems, lang }: InfoSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    // Could add a temporary "Copied!" state here
  };

  if (infoItems.length === 0) {
    return (
      <div className="section-container" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--gris-medio)' }}>
        <span className="material-icons-round" style={{ fontSize: 48, opacity: 0.3 }}>info</span>
        <p style={{ marginTop: 8 }}>{getTranslation('no_info', lang)}</p>
      </div>
    );
  }

  return (
    <div className="section-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-md)' }}>
      {infoItems.map(item => {
        const isExpanded = expandedItems[item.id];
        const isWifi = item.key.toLowerCase() === 'wifi';
        const isEmergency = item.key.toLowerCase() === 'emergency';
        const isLongText = item.content.length > 150 && !isWifi;

        const iconBg = isWifi ? 'var(--mar-espuma)' : isEmergency ? '#FEE2E2' : 'var(--arena-dorada)';
        const iconColor = isWifi ? 'var(--brand-primary)' : isEmergency ? '#DC2626' : 'var(--terracota)';

        return (
          <div key={item.id} style={{
            background: 'var(--blanco-puro)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--sp-md)',
            boxShadow: 'var(--sh-sm)',
            border: `1px solid ${isEmergency ? '#FECACA' : 'var(--gris-suave)'}`
          }}>
            <div 
              style={{ display: 'flex', gap: 'var(--sp-sm)', alignItems: 'flex-start', cursor: isLongText ? 'pointer' : 'default' }}
              onClick={() => isLongText && toggleExpand(item.id)}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: 'var(--r-md)', flexShrink: 0,
                background: iconBg, color: iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="material-icons-round">{item.icon || 'info'}</span>
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--negro-suave)', marginBottom: '4px' }}>
                    {item.title}
                  </h3>
                  {isLongText && (
                    <span className="material-icons-round" style={{ color: 'var(--gris-medio)', fontSize: '20px' }}>
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  )}
                </div>

                {isWifi ? (
                  <div style={{ 
                    marginTop: '12px', background: 'var(--blanco-calido)', 
                    padding: '12px', borderRadius: 'var(--r-md)', border: '1px solid var(--gris-suave)' 
                  }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--brand-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {item.content}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(item.content, item.id); }}
                      style={{
                        marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-primary)',
                        background: 'var(--mar-espuma)', padding: '6px 12px', borderRadius: 'var(--r-pill)'
                      }}
                    >
                      <span className="material-icons-round" style={{ fontSize: '14px' }}>content_copy</span>
                      {getTranslation('copy_btn', lang)}
                    </button>
                  </div>
                ) : (
                  <div style={{ 
                    fontSize: '0.9rem', color: 'var(--gris-texto)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    display: isExpanded ? 'block' : '-webkit-box',
                    WebkitLineClamp: isExpanded ? 'unset' : 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: isExpanded ? 'visible' : 'hidden'
                  }}>
                    {item.content}
                  </div>
                )}

                {item.media && item.media.length > 0 && isExpanded && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {item.media.map(m => (
                      <img 
                        key={m.id} 
                        src={m.url} 
                        alt="" 
                        style={{ height: '120px', borderRadius: 'var(--r-sm)', objectFit: 'cover' }} 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
