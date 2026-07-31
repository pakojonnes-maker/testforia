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
    { id: 'restaurants', icon: 'restaurant', label: getTranslation('tab_restaurants', lang) },
    { id: 'services', icon: 'storefront', label: getTranslation('tab_services', lang) },
  ];
  const isChatActive = activeTab === 'chat';

  return (
    <nav className="md:hidden bg-crisp-white dark:bg-inverse-surface fixed bottom-0 left-0 w-full z-50 rounded-t-xl shadow-[0px_-4px_20px_rgba(201,109,75,0.08)] grid grid-cols-5 items-center py-3 px-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={isActive
              ? "flex flex-col items-center justify-center gap-0.5 mx-auto text-terracotta dark:text-primary-fixed font-bold bg-primary-fixed/20 rounded-xl px-2 py-1 max-w-full scale-90 transition-transform"
              : "flex flex-col items-center justify-center gap-0.5 mx-auto text-on-surface-variant dark:text-surface-variant hover:bg-warm-sand dark:hover:bg-tertiary-container/30 rounded-xl px-2 py-1 max-w-full transition-colors"
            }
          >
            <span
              className="material-symbols-outlined"
              style={isActive && tab.fill ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {tab.icon}
            </span>
            <span className="text-label-sm font-label-sm leading-tight text-center truncate max-w-full">{tab.label}</span>
          </button>
        );
      })}

      {/* AI chat: raised, always-highlighted button so it reads as the standout action, not a regular tab */}
      <button
        onClick={() => onTabChange('chat')}
        aria-label={getTranslation('tab_chat', lang)}
        className="flex flex-col items-center justify-center gap-0.5 mx-auto -mt-7 group"
      >
        <span
          className={`flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-terracotta to-olive shadow-[0_4px_16px_rgba(201,109,75,0.45)] transition-transform group-active:scale-95 ${
            isChatActive ? 'ring-4 ring-terracotta/25' : ''
          }`}
        >
          <span className="material-symbols-outlined text-crisp-white text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            auto_awesome
          </span>
        </span>
        <span className={`text-label-sm font-label-sm leading-tight text-center truncate max-w-full ${isChatActive ? 'text-terracotta font-bold' : 'text-on-surface-variant dark:text-surface-variant'}`}>
          {getTranslation('tab_chat', lang)}
        </span>
      </button>
    </nav>
  );
}
