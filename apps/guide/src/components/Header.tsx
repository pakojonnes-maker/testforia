import React, { useState } from 'react';
import { getTranslation } from '../lib/i18n';

// 13 active languages (see CLAUDE.md §5). zh→cn, ko→kr, uk→ua, ar→ae flag mapping.
const LANG_MAP: Record<string, string> = {
  es: '🇪🇸 Español', en: '🇬🇧 English', fr: '🇫🇷 Français', de: '🇩🇪 Deutsch',
  it: '🇮🇹 Italiano', pt: '🇵🇹 Português', ca: '🏴󠁥󠁳󠁣󠁴󠁿 Català', ar: '🇦🇪 العربية',
  ru: '🇷🇺 Русский', uk: '🇺🇦 Українська', zh: '🇨🇳 中文', ja: '🇯🇵 日本語', ko: '🇰🇷 한국어',
};

type TabKey = 'info' | 'discover' | 'restaurants' | 'services' | 'chat';

interface HeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  lang: string;
  onLanguageChange?: (lang: string) => void;
  apartmentName: string;
}

export default function Header({ activeTab, onTabChange, lang, onLanguageChange, apartmentName }: HeaderProps) {
  const [showLangMenu, setShowLangMenu] = useState(false);
  // Mobile secondary tabs for 'info'
  const infoTabs = [
    { id: 'alojamiento', label: getTranslation('nav_secondary_alojamiento', lang) },
    { id: 'servicios', label: getTranslation('nav_secondary_servicios', lang) },
    { id: 'manuales', label: getTranslation('nav_secondary_manuales', lang) }
  ];

  return (
    <header className="bg-surface dark:bg-on-background shadow-sm docked full-width top-0 z-40 sticky">
      <div className="flex flex-col w-full pt-4 px-margin-mobile gap-4 max-w-container-max mx-auto">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-terracotta dark:text-primary-fixed">language</span>
          </div>
          
          {/* Web Navigation (Hidden on Mobile) */}
          <nav className="hidden md:flex gap-8">
            <button
              onClick={() => onTabChange('info')}
              className={`pb-2 transition-colors scale-95 duration-150 ease-in-out font-bold ${activeTab === 'info' ? 'text-olive border-b-2 border-olive' : 'text-on-surface-variant dark:text-surface-variant hover:text-terracotta dark:hover:text-primary-fixed'}`}
            >
              {getTranslation('tab_info', lang)}
            </button>
            <button
              onClick={() => onTabChange('discover')}
              className={`pb-2 transition-colors scale-95 duration-150 ease-in-out font-bold ${activeTab === 'discover' ? 'text-olive border-b-2 border-olive' : 'text-on-surface-variant dark:text-surface-variant hover:text-terracotta dark:hover:text-primary-fixed'}`}
            >
              {getTranslation('tab_discover', lang)}
            </button>
            <button
              onClick={() => onTabChange('services')}
              className={`pb-2 transition-colors scale-95 duration-150 ease-in-out font-bold ${activeTab === 'services' ? 'text-olive border-b-2 border-olive' : 'text-on-surface-variant dark:text-surface-variant hover:text-terracotta dark:hover:text-primary-fixed'}`}
            >
              {getTranslation('tab_services', lang)}
            </button>
            <button
              onClick={() => onTabChange('chat')}
              className={`pb-2 transition-colors scale-95 duration-150 ease-in-out font-bold ${activeTab === 'chat' ? 'text-olive border-b-2 border-olive' : 'text-on-surface-variant dark:text-surface-variant hover:text-terracotta dark:hover:text-primary-fixed'}`}
            >
              {getTranslation('tab_chat', lang)}
            </button>
          </nav>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="hidden md:flex items-center gap-2 bg-warm-sand px-4 py-2 rounded-full text-deep-sea font-label-sm text-label-sm hover:bg-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">translate</span>
                {lang.toUpperCase()}
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>
              
              {showLangMenu && (
                <div className="absolute top-full right-0 mt-2 bg-crisp-white border border-warm-sand rounded-xl shadow-md z-50 min-w-[160px] overflow-hidden">
                  {Object.entries(LANG_MAP).map(([code, name]) => (
                    <div 
                      key={code}
                      onClick={() => {
                        if (onLanguageChange) onLanguageChange(code);
                        setShowLangMenu(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-body-md hover:bg-warm-sand cursor-pointer"
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-crisp-white shadow-sm flex items-center justify-center bg-surface-variant text-on-surface-variant">
              <span className="material-symbols-outlined">person</span>
            </div>
          </div>
        </div>

        {/* Mobile Section Tabs (Only show if info tab is active or adapt dynamically) */}
        {activeTab === 'info' && (
          <div className="flex md:hidden gap-6 overflow-x-auto pb-2 scrollbar-hide">
            {infoTabs.map((tab, idx) => (
              <button 
                key={tab.id}
                className={idx === 0 
                  ? "text-olive border-b-2 border-olive pb-2 font-label-lg text-label-lg whitespace-nowrap"
                  : "text-on-surface-variant pb-2 font-label-lg text-label-lg whitespace-nowrap"
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
