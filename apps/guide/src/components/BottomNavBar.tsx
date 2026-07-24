import React from 'react';
import { getTranslation } from '../lib/i18n';

type TabKey = 'info' | 'discover' | 'restaurants' | 'services' | 'chat';

interface BottomNavBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  lang: string;
}

export default function BottomNavBar({ activeTab, onTabChange, lang }: BottomNavBarProps) {
  const tabs: Array<{ id: TabKey; icon: string; label: string; fill?: boolean }> = [
    { id: 'info', icon: 'home', label: getTranslation('tab_info', lang), fill: true },
    { id: 'discover', icon: 'location_on', label: getTranslation('tab_discover', lang) },
    { id: 'services', icon: 'sell', label: getTranslation('tab_services', lang) },
    { id: 'chat', icon: 'spark', label: getTranslation('tab_chat', lang) }
  ];

  return (
    <nav className="md:hidden bg-crisp-white dark:bg-inverse-surface fixed bottom-0 left-0 w-full z-50 rounded-t-xl shadow-[0px_-4px_20px_rgba(201,109,75,0.08)] flex justify-around items-center py-3 px-4">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={isActive 
              ? "flex flex-col items-center justify-center text-terracotta dark:text-primary-fixed font-bold bg-primary-fixed/20 rounded-xl px-3 py-1 scale-90 transition-transform"
              : "flex flex-col items-center justify-center text-on-surface-variant dark:text-surface-variant hover:bg-warm-sand dark:hover:bg-tertiary-container/30 px-3 py-1 rounded-xl transition-colors"
            }
          >
            <span 
              className="material-symbols-outlined" 
              style={isActive && tab.fill ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {tab.icon}
            </span>
            <span className="text-label-sm font-label-sm mt-1">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
