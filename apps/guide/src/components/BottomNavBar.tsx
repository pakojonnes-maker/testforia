import React from 'react';
import { getTranslation } from '../lib/i18n';

type TabKey = 'info' | 'discover' | 'restaurants' | 'services' | 'chat';

interface BottomNavBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  lang: string;
}

// Mobile bottom bar: high-contrast icons, no labels (DESIGN.md — Navigation:
// "Mobile: Bottom bar with high-contrast icons. No labels. Use Mar Profundo
// for the active state"). Labels move to aria-label for accessibility.
export default function BottomNavBar({ activeTab, onTabChange, lang }: BottomNavBarProps) {
  const tabs: Array<{ id: TabKey; icon: string; label: string }> = [
    { id: 'info', icon: 'home_work', label: getTranslation('tab_info', lang) },
    { id: 'discover', icon: 'explore', label: getTranslation('tab_discover', lang) },
    { id: 'restaurants', icon: 'restaurant_menu', label: getTranslation('tab_restaurants', lang) },
    { id: 'services', icon: 'shopping_bag', label: getTranslation('tab_services', lang) },
    { id: 'chat', icon: 'smart_toy', label: getTranslation('tab_chat', lang) },
  ];

  return (
    <nav className="md:hidden bg-surface-container-lowest fixed bottom-0 left-0 w-full z-50 border-t border-on-background/10 grid grid-cols-5 items-center h-16 px-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center justify-center h-full transition-transform ${
              isActive ? 'text-primary scale-110' : 'text-outline hover:text-primary'
            }`}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {tab.icon}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
