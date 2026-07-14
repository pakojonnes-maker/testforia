import React, { useState } from 'react';
import { getTranslation } from '../lib/i18n';

interface QuickInfoBarProps {
  infoItems: Array<{ id: string; key: string; icon: string; title: string; content: string; media: any[] }>;
  lang: string;
}

export default function QuickInfoBar({ infoItems, lang }: QuickInfoBarProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Filter top priority items for the quick bar
  const priorityKeys = ['wifi', 'checkout', 'parking', 'floor', 'emergency'];
  
  const quickItems = infoItems
    .filter(item => priorityKeys.includes(item.key.toLowerCase()))
    .sort((a, b) => priorityKeys.indexOf(a.key.toLowerCase()) - priorityKeys.indexOf(b.key.toLowerCase()))
    .slice(0, 4);

  if (quickItems.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  return (
    <div style={{
      marginTop: '-24px',
      position: 'relative',
      zIndex: 10,
      padding: '0 var(--sp-md)',
      marginBottom: 'var(--sp-md)'
    }}>
      <div style={{
        display: 'flex',
        gap: '10px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: '8px'
      }}>
        {quickItems.map(item => {
          const isWifi = item.key.toLowerCase() === 'wifi';
          return (
            <button
              key={item.id}
              onClick={() => toggleExpand(item.id)}
              style={{
                flexShrink: 0,
                background: 'var(--blanco-puro)',
                borderRadius: 'var(--r-md)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--sh-md)',
                border: '1px solid var(--gris-suave)',
                color: 'var(--negro-suave)',
                transition: 'transform 0.2s',
                transform: expandedItem === item.id ? 'translateY(-2px)' : 'none'
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: isWifi ? 'var(--mar-espuma)' : 'var(--arena-dorada)',
                color: isWifi ? 'var(--brand-primary)' : 'var(--terracota)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="material-icons-round" style={{ fontSize: '18px' }}>
                  {item.icon || 'info'}
                </span>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gris-texto)' }}>
                  {item.title}
                </div>
                {!isWifi && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.content}
                  </div>
                )}
                {isWifi && expandedItem !== item.id && (
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
                    Ver clave
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded Content Area */}
      {expandedItem && (
        <div style={{
          background: 'var(--blanco-puro)',
          borderRadius: 'var(--r-md)',
          padding: '16px',
          marginTop: '8px',
          boxShadow: 'var(--sh-md)',
          border: '1px solid var(--gris-suave)',
          animation: 'fadeIn 0.3s ease'
        }}>
          {quickItems.filter(i => i.id === expandedItem).map(item => (
            <div key={item.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 className="serif" style={{ fontSize: '1.2rem', color: 'var(--brand-secondary)' }}>
                  {item.title}
                </h3>
                <button onClick={() => setExpandedItem(null)} style={{ color: 'var(--gris-medio)' }}>
                  <span className="material-icons-round">close</span>
                </button>
              </div>
              
              {item.key.toLowerCase() === 'wifi' ? (
                <div style={{ background: 'var(--mar-espuma)', padding: '16px', borderRadius: 'var(--r-sm)' }}>
                  <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '1.1rem', color: 'var(--brand-secondary)' }}>
                    {item.content}
                  </div>
                </div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--gris-texto)', lineHeight: 1.6 }}>
                  {item.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
