import React from 'react';
import { getTranslation } from '../lib/i18n';

type TabKey = 'info' | 'discover' | 'restaurants' | 'services';

interface NavigationTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  lang: string;
}

export default function NavigationTabs({ activeTab, onTabChange, lang }: NavigationTabsProps) {
  const tabs: Array<{ id: TabKey; icon: string; labelKey: string }> = [
    { id: 'info', icon: 'home', labelKey: 'tab_info' },
    { id: 'discover', icon: 'explore', labelKey: 'tab_discover' },
    { id: 'restaurants', icon: 'restaurant', labelKey: 'tab_eat' },
    { id: 'services', icon: 'star', labelKey: 'tab_services' }
  ];

  return (
    <nav style={{
      display: 'flex',
      gap: '8px',
      padding: '12px 16px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
      WebkitOverflowScrolling: 'touch',
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--gris-suave)',
      position: 'sticky',
      top: 0,
      zIndex: 20
    }}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: 'var(--r-pill)',
              fontSize: '0.85rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              color: isActive ? 'var(--brand-primary)' : 'var(--gris-texto)',
              background: isActive ? 'var(--mar-espuma)' : 'transparent',
              transition: 'all 0.2s',
              flexShrink: 0,
              border: isActive ? '1px solid rgba(21, 101, 192, 0.1)' : '1px solid transparent',
              position: 'relative'
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '18px' }}>
              {tab.icon}
            </span>
            {getTranslation(tab.labelKey, lang)}
            {isActive && (
              <div style={{
                position: 'absolute',
                bottom: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '24px',
                height: '3px',
                background: 'var(--terracota)',
                borderRadius: '3px'
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
