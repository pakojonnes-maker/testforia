import React, { useState } from 'react';
import { getTranslation } from '../lib/i18n';

// 13 active languages (see CLAUDE.md §5).
const LANG_NAMES: Record<string, string> = {
  es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch', it: 'Italiano',
  pt: 'Português', ca: 'Català', ar: 'العربية', ru: 'Русский', uk: 'Українська',
  zh: '中文', ja: '日本語', ko: '한국어',
};

// Emoji fallback (Unicode flag emoji don't render on Windows — no bundled glyphs — so
// the primary source is the flag artwork already served for the menu app, see below).
const FLAG_EMOJI: Record<string, string> = {
  es: '🇪🇸', en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', pt: '🇵🇹', ca: '🏴󠁥󠁳󠁣󠁴󠁿',
  ar: '🇦🇪', ru: '🇷🇺', uk: '🇺🇦', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷',
};

// ISO 639-1 language → ISO 3166-1 country code, matching the flag files already
// served for the menu app (apps/client/src/components/reels/LanguageSwitcher.tsx).
const FLAG_COUNTRY_CODE: Record<string, string> = {
  ar: 'ae', ca: 'es-ct', en: 'gb', ja: 'jp', ko: 'kr', uk: 'ua', zh: 'cn',
};

const API_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

function flagUrl(langCode: string): string {
  const country = FLAG_COUNTRY_CODE[langCode] || langCode;
  return `${API_URL}/media/System/flags/${country}.svg`;
}

function FlagIcon({ lang, size = 18 }: { lang: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return <span style={{ fontSize: size }}>{FLAG_EMOJI[lang] || '🌐'}</span>;
  }
  return (
    <img
      src={flagUrl(lang)}
      alt=""
      width={size}
      height={size}
      className="object-cover shrink-0"
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  );
}

type TabKey = 'info' | 'discover' | 'restaurants' | 'services' | 'chat';

interface HeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  lang: string;
  onLanguageChange?: (lang: string) => void;
  apartmentName: string;
}

const TABS: Array<{ id: TabKey; key: string }> = [
  { id: 'info', key: 'tab_info' },
  { id: 'discover', key: 'tab_discover' },
  { id: 'restaurants', key: 'tab_restaurants' },
  { id: 'services', key: 'tab_services' },
  { id: 'chat', key: 'tab_chat' },
];

export default function Header({ activeTab, onTabChange, lang, onLanguageChange, apartmentName }: HeaderProps) {
  const [showLangMenu, setShowLangMenu] = useState(false);

  return (
    <header className="bg-background sticky top-0 z-40 border-b-2 border-primary">
      <div className="flex flex-col w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="flex justify-between items-center w-full gap-4 py-4 md:py-6">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>cottage</span>
            <span className="font-display-lg text-[18px] md:text-headline-md text-primary uppercase tracking-tight line-clamp-1">{apartmentName}</span>
          </div>

          {/* Web Navigation (Hidden on Mobile — BottomNavBar covers mobile tab switching) */}
          <nav className="hidden md:flex gap-8">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`pb-1 font-label-caps text-label-caps uppercase tracking-widest transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                {getTranslation(tab.key, lang)}
              </button>
            ))}
          </nav>

          <div className="relative shrink-0">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              aria-label="Language"
              aria-haspopup="true"
              aria-expanded={showLangMenu}
              className="flex items-center justify-center w-9 h-9 border border-on-background/10 bg-surface-container-lowest text-on-background hover:border-primary transition-colors md:w-auto md:h-auto md:justify-start md:gap-2 md:px-4 md:py-2 font-label-caps text-label-caps uppercase"
            >
              <FlagIcon lang={lang} size={18} />
              <span className="hidden md:inline">{lang.toUpperCase()}</span>
              <span className="material-symbols-outlined text-[16px] hidden md:inline">expand_more</span>
            </button>

            {showLangMenu && (
              <div className="absolute top-full right-0 mt-2 bg-surface-container-lowest border border-on-background/10 z-50 min-w-[160px] max-w-[calc(100vw-2rem)] overflow-hidden">
                {Object.keys(LANG_NAMES).map((code) => (
                  <div
                    key={code}
                    onClick={() => {
                      if (onLanguageChange) onLanguageChange(code);
                      setShowLangMenu(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 font-body-md text-body-md hover:bg-warm-sand cursor-pointer"
                  >
                    <FlagIcon lang={code} size={18} />
                    {LANG_NAMES[code]}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
