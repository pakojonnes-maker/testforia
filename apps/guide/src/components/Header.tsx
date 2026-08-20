import React, { useEffect, useRef, useState } from 'react';
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

// Flag files are rectangular (most common convention is 3:2 — width:height),
// not square. Forcing them into a square box with object-cover crops a
// visible chunk off every non-square flag; a 3:2 box crops nothing for the
// vast majority and only trims a sliver on the few that aren't exactly 3:2.
// La bandera se dibuja a sangre, sin caja de color detrás: antes vivía centrada
// dentro de un botón blanco (#ffffff sobre el fondo hueso de la página), así que
// ocupaba ~15% de su propio control y lo que se veía era el parche blanco.
// `fill` la hace llenar el contenedor — es lo que convierte el botón flotante
// del mapa en un disco-bandera en vez de un disco blanco con una pegatina.
function FlagIcon({ lang, width = 24, height = 16, fill = false, className = '' }: {
  lang: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <span
        className={`flex items-center justify-center shrink-0 ${fill ? 'w-full h-full bg-surface-variant' : ''} ${className}`}
        style={fill ? { fontSize: 22, lineHeight: 1 } : { fontSize: Math.round(height * 1.1), lineHeight: 1, width, height, minWidth: width }}
      >
        {FLAG_EMOJI[lang] || '🌐'}
      </span>
    );
  }

  return (
    <img
      src={flagUrl(lang)}
      alt=""
      className={`object-cover shrink-0 ${fill ? 'w-full h-full' : ''} ${className}`}
      style={fill ? undefined : { width, height, minWidth: width }}
      onError={() => setErrored(true)}
    />
  );
}

interface LanguageSwitcherProps {
  lang: string;
  onLanguageChange?: (lang: string) => void;
  /** `bar`: the app header's own control (uppercase code on md+). `floating`: standalone over the map (Explore tab has no header — see GuidebookPage.tsx). */
  variant?: 'bar' | 'floating';
}

export function LanguageSwitcher({ lang, onLanguageChange, variant = 'bar' }: LanguageSwitcherProps) {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Un desplegable que solo se cerraba eligiendo idioma dejaba al huésped
  // atrapado si lo abría sin querer (13 entradas tapando media pantalla).
  useEffect(() => {
    if (!showLangMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setShowLangMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLangMenu(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [showLangMenu]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setShowLangMenu(!showLangMenu)}
        aria-label="Language"
        aria-haspopup="true"
        aria-expanded={showLangMenu}
        className={
          variant === 'floating'
            // Sobre el mapa el disco ES la bandera. El anillo blanco fino la
            // separa del mapa (mismo recurso que los avatares de Google Maps)
            // sin volver a meter un fondo blanco debajo.
            ? 'block w-11 h-11 rounded-full overflow-hidden ring-2 ring-crisp-white/80 shadow-md'
            : 'flex items-center justify-center h-9 w-9 md:w-auto md:h-auto md:gap-2 md:px-2 md:py-1 text-on-background hover:opacity-70 transition-opacity font-label-caps text-label-caps uppercase'
        }
      >
        {variant === 'floating' ? (
          <FlagIcon lang={lang} fill />
        ) : (
          <>
            <FlagIcon lang={lang} className="ring-1 ring-on-background/15" />
            <span className="hidden md:inline">{lang.toUpperCase()}</span>
            <span className="material-symbols-outlined text-[16px] hidden md:inline">expand_more</span>
          </>
        )}
      </button>

      {showLangMenu && (
        <div className="absolute top-full end-0 mt-2 bg-surface-container-lowest border border-on-background/10 z-50 min-w-[180px] max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto shadow-lg">
          {Object.keys(LANG_NAMES).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                if (onLanguageChange) onLanguageChange(code);
                setShowLangMenu(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 font-body-md text-body-md text-start hover:bg-warm-sand transition-colors ${code === lang ? 'text-primary' : 'text-on-background'}`}
            >
              <FlagIcon lang={code} className="ring-1 ring-on-background/15" />
              <span className="min-w-0 truncate">{LANG_NAMES[code]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
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
  return (
    <header className="bg-background sticky top-0 z-40 border-b-2 border-primary">
      <div className="flex flex-col w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="flex justify-between items-center w-full gap-4 py-4 md:py-6">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>cottage</span>
            {/* Cabecera tipo masthead editorial (Stitch): logotipo pequeño en
                serif, versalitas y tracking amplio — no un titular grande. El
                peso tipográfico del sistema va en los títulos de sección. */}
            <span className="font-display-lg text-[14px] md:text-[16px] text-primary uppercase tracking-[0.18em] line-clamp-1">{apartmentName}</span>
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

          <LanguageSwitcher lang={lang} onLanguageChange={onLanguageChange} variant="bar" />
        </div>
      </div>
    </header>
  );
}
