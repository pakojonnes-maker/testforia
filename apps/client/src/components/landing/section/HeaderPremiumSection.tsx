// src/components/landing/section/HeaderNav.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';

type Section = {
  section_key: string;
  section_name?: string;
  is_active: boolean;
  order_index: number;
};

type Theme = {
  background_color?: string;
  text_color?: string;
  accent_color?: string;
  secondary_color?: string;
  primary_color?: string;
  font_accent?: string;
};

type Restaurant = {
  name?: string;
  logo_url?: string;
};

type Language = {
  code: string;
  name?: string;
  native_name?: string;
  flag_emoji?: string;
};

type HeaderConfig = {
  variant?: 'glass' | 'transparent' | 'solid';
  sticky?: boolean;
  show_logo?: boolean;
  show_title?: boolean;
  max_width?: string;
};

type Props = {
  restaurant?: Restaurant;
  theme?: Theme;
  sections?: Section[];
  translations?: Record<string, string>;
  config?: HeaderConfig | string;
  languages?: Language[]; // Opcional - usará del contexto si no se provee
  currentLanguage?: string; // Opcional - usará del contexto si no se provee
  // onLanguageChange removido - ahora usa el contexto directamente
};

const MEDIA_BASE_URL = 'https://visualtasteworker.franciscotortosaestudios.workers.dev/media';

const parseCfg = (cfg?: HeaderConfig | string): HeaderConfig => {
  if (!cfg) return {};
  if (typeof cfg === 'string') {
    try { return JSON.parse(cfg); } catch { return {}; }
  }
  return cfg;
};

const hexToRgba = (hex: string, alpha = 1): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const autoContrast = (hex: string): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 155 ? '#111111' : '#ffffff';
};

const titleCase = (str: string): string =>
  str.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const getFlagUrl = (code: string): string =>
  `${MEDIA_BASE_URL}/System/flags/${code.toLowerCase()}.svg`;

export default function HeaderNav({
  restaurant,
  theme,
  sections = [],
  translations,
  config,
  languages: languagesProp,
  currentLanguage: currentLanguageProp,
}: Props) {
  // ✅ Usar el contexto de idioma para gestión global
  const { currentLanguage: contextLanguage, setLanguage, availableLanguages } = useLanguage();

  // Props tienen prioridad sobre contexto (para compatibilidad)
  const languages = languagesProp || availableLanguages;
  const currentLanguage = currentLanguageProp || contextLanguage;
  const cfg = useMemo(() => parseCfg(config), [config]);

  const baseBg = theme?.background_color || theme?.primary_color || '#ffffff';
  const accent = theme?.accent_color || theme?.secondary_color || '#D6AA52';
  const txt = theme?.text_color || autoContrast(baseBg);

  const [domReady, setDomReady] = useState(false);
  useEffect(() => { setDomReady(true); }, []);

  const items = useMemo(() => {
    const ordered = sections
      .filter(s => s.is_active && s.section_key && s.section_key !== 'header')
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map(s => {
        const key = s.section_key;
        const label = translations?.[`nav_${key}`] || s.section_name || titleCase(key);
        return { id: key, label };
      });
    if (!domReady) return ordered;
    return ordered.filter(it => !!document.getElementById(it.id));
  }, [sections, translations, domReady]);

  const headerRef = useRef<HTMLElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<string>(items[0]?.id || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [headerH, setHeaderH] = useState(64);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderH(el.getBoundingClientRect().height || 64);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const computeActive = () => {
      const y = window.scrollY + headerH + 4;
      let current = items[0]?.id || '';
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && y >= el.offsetTop) current = it.id;
      }
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 2;
      setActive(nearBottom ? items[items.length - 1]?.id || current : current);
    };
    const onScroll = () => computeActive();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [items, headerH]);

  const onGo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.pageYOffset - headerH;
    window.scrollTo({ top, behavior: 'smooth' });
    setMenuOpen(false);
  };

  const handleLangChange = (code: string) => {
    // ✅ Usar setLanguage del contexto
    setLanguage(code);
    setLangOpen(false);
  };

  const variant = cfg.variant || 'glass';
  const sticky = cfg.sticky ?? true;
  const showLogo = cfg.show_logo !== false;
  const showTitle = cfg.show_title !== false;

  const bg = variant === 'transparent' ? 'transparent'
    : variant === 'solid' ? hexToRgba(baseBg, 0.96)
      : hexToRgba(baseBg, 0.3);
  const blur = variant === 'glass' ? 'saturate(180%) blur(14px)' : 'none';
  const accentBorder = hexToRgba(accent, 0.4);

  // ✅ PREFIJO ÚNICO: .hnav-*
  const styles = `
    .hnav-root {
      position: ${sticky ? 'sticky' : 'relative'};
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      font-family: "Fraunces Variable", "Fraunces", Georgia, serif;
    }

    .hnav-blur {
      position: absolute;
      inset: 0;
      background: ${bg};
      backdrop-filter: ${blur};
      border-bottom: 1px solid ${accentBorder};
      z-index: 1;
      pointer-events: none;
    }

    .hnav-content {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: ${cfg.max_width || '1400px'};
      margin: 0 auto;
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: clamp(8px, 2vw, 16px);
      padding: clamp(10px, 2vw, 14px) clamp(12px, 3vw, 20px);
    }

    .hnav-brand {
      display: flex;
      align-items: center;
      gap: clamp(8px, 1.5vw, 12px);
      min-width: 0;
    }

    .hnav-logo {
      width: clamp(32px, 6vw, 40px);
      height: clamp(32px, 6vw, 40px);
      border-radius: clamp(8px, 1.5vw, 12px);
      object-fit: cover;
      flex-shrink: 0;
    }

    .hnav-logo-ph {
      width: clamp(32px, 6vw, 40px);
      height: clamp(32px, 6vw, 40px);
      border-radius: clamp(8px, 1.5vw, 12px);
      display: grid;
      place-items: center;
      background: ${hexToRgba(accent, 0.9)};
      color: ${autoContrast(accent)};
      font-weight: 400;
      font-size: clamp(16px, 3vw, 20px);
      flex-shrink: 0;
    }

    .hnav-title {
      margin: 0;
      font-weight: 600;
      color: ${txt};
      font-size: clamp(14px, 2.5vw, 18px);
      font-family: "Fraunces Variable", "Fraunces", Georgia, serif;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .hnav-nav-wrapper {
      display: none;
    }

    .hnav-actions {
      display: flex;
      align-items: center;
      gap: clamp(6px, 1.5vw, 10px);
      justify-self: end;
    }

    .hnav-lang-picker {
      position: relative;
    }

    .hnav-lang-trigger {
      width: clamp(34px, 6vw, 40px);
      height: clamp(34px, 6vw, 40px);
      border-radius: clamp(8px, 1.5vw, 10px);
      border: 1px solid ${accentBorder};
      background: ${hexToRgba('#fff', 0.8)};
      cursor: pointer;
      transition: all 0.2s ease;
      overflow: hidden;
      display: grid;
      place-items: center;
      padding: 0;
    }

    .hnav-lang-trigger:hover {
      border-color: ${accent};
      background: ${hexToRgba('#fff', 0.95)};
      transform: scale(1.05);
    }

    .hnav-lang-flag {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .hnav-lang-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      background: ${hexToRgba(baseBg, 0.96)};
      backdrop-filter: ${blur};
      border: 1px solid ${accentBorder};
      border-radius: clamp(8px, 1.5vw, 12px);
      padding: 6px;
      min-width: clamp(160px, 30vw, 200px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      animation: hnavFadeIn 0.15s ease;
      z-index: 1001;
    }

    @keyframes hnavFadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .hnav-lang-option {
          background: ${hexToRgba(accent, 0.15)};
              margin-bottom: 5px;
    width: 100%;
      display: flex;
      align-items: center;
      gap: clamp(8px, 2vw, 12px);
      padding: clamp(8px, 1.5vw, 10px);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }

    .hnav-lang-option:hover {
      background: ${hexToRgba(accent, 0.1)};
      border-color: ${accentBorder};
    }

    .hnav-lang-option.active {
      background: ${hexToRgba(accent, 0.15)};
      border-color: ${accent};
    }

    .hnav-lang-option-flag {
      width: clamp(20px, 4vw, 26px);
      height: clamp(20px, 4vw, 26px);
      border-radius: 6px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .hnav-lang-option-text {
      flex: 1;
      font-size: clamp(13px, 2.5vw, 15px);
      color: ${txt};
      font-weight: 500;
    }

    .hnav-burger {
      width: clamp(34px, 6vw, 40px);
      height: clamp(34px, 6vw, 40px);
      border-radius: clamp(8px, 1.5vw, 10px);
      border: 1px solid ${accentBorder};
      background: ${hexToRgba(accent, 0.15)};
      color: ${txt};
      display: grid;
      place-items: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .hnav-burger:hover {
      background: ${hexToRgba('#fff', 0.95)};
      border-color: ${accent};
      transform: scale(1.05);
    }

    .hnav-sheet {
      position: fixed;
      top: ${headerH}px;
      left: 0;
      right: 0;
      background: ${hexToRgba(baseBg, 0.96)};
      backdrop-filter: ${blur};
      border-bottom: 1px solid ${accentBorder};
      z-index: 999;
      animation: hnavSlideDown 0.2s ease;
      max-height: calc(100vh - ${headerH}px);
      overflow-y: auto;
    }

    @keyframes hnavSlideDown {
      from { transform: translateY(-8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .hnav-sheet-list {
      display: flex;
      flex-direction: column;
      padding: clamp(8px, 2vw, 12px);
      gap: 6px;
    }

    .hnav-sheet-link {
      text-align: left;
      padding: clamp(10px, 2vw, 14px) clamp(12px, 2.5vw, 16px);
      border-radius: clamp(8px, 1.5vw, 10px);
      border: 1px solid ${accentBorder};
      background: ${hexToRgba(accent, 0.15)};
      color: ${txt};
      font-weight: 500;
      font-size: clamp(14px, 2.5vw, 16px);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .hnav-sheet-link:hover {
      background: ${hexToRgba('#fff', 0.9)};
      border-color: ${accent};
      transform: translateX(4px);
    }

    .hnav-sheet-link.active {
      color: ${accent};
      border-color: ${accent};
      background: ${hexToRgba(accent, 0.08)};
      font-weight: 600;
    }

    @media (min-width: 920px) {
      .hnav-content {
        padding: clamp(12px, 2vw, 16px) clamp(16px, 3vw, 24px);
      }

      .hnav-title {
        font-size: clamp(16px, 2.5vw, 20px);
      }

      .hnav-burger {
        display: none;
      }

      .hnav-nav-wrapper {
        display: flex;
        justify-self: center;
        align-items: center;
        gap: 4px;
      }

      .hnav-nav-list {
        display: flex;
        align-items: center;
        gap: 4px;
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .hnav-section-link {
        font-family: 'Fraunces Variable';
        background: transparent;
        color: ${txt};
        opacity: 0.8;
        padding: clamp(8px, 1.5vw, 10px) clamp(12px, 2vw, 16px);
        border-radius: clamp(8px, 1.5vw, 10px);
        cursor: pointer;
        white-space: nowrap;
        font-weight: 500;
        font-size: clamp(14px, 2vw, 16px);
        transition: all 0.2s ease;
        border: 1px solid transparent;
      }

      .hnav-section-link:hover {
        opacity: 1;
        background: ${hexToRgba(accent, 0.06)};
        border-color: ${accentBorder};
        transform: translateY(-1px);
      }

      .hnav-section-link.active {
        color: ${accent};
        opacity: 1;
        background: ${hexToRgba(accent, 0.1)};
        border-color: ${accent};
        font-weight: 600;
      }

      .hnav-lang-trigger {
        width: clamp(36px, 6vw, 42px);
        height: clamp(36px, 6vw, 42px);
      }
    }
  `;

  if (!items.length) return null;

  const currentLang = languages.find(l => l.code === currentLanguage) || languages[0];
  const hasBrand = showLogo || showTitle;

  return (
    <header ref={headerRef as any} className="hnav-root" role="banner">
      <style>{styles}</style>
      <div className="hnav-blur" aria-hidden="true" />
      <div className="hnav-content">
        {hasBrand && (
          <div className="hnav-brand">
            {showLogo && (restaurant?.logo_url ? (
              <img className="hnav-logo" src={restaurant.logo_url} alt={restaurant?.name || 'Logo'} />
            ) : (
              <div className="hnav-logo-ph" aria-hidden="true">🍽️</div>
            ))}
            {showTitle && restaurant?.name && (
              <h1 className="hnav-title">{restaurant.name}</h1>
            )}
          </div>
        )}

        <nav className="hnav-nav-wrapper" role="navigation" aria-label="Main navigation">
          <ul className="hnav-nav-list">
            {items.map(it => (
              <li key={it.id}>
                <button
                  className={`hnav-section-link ${active === it.id ? 'active' : ''}`}
                  onClick={() => onGo(it.id)}
                  aria-current={active === it.id ? 'page' : undefined}
                >
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hnav-actions">
          {!!languages.length && (
            <div className="hnav-lang-picker" ref={langRef as any}>
              <button
                className="hnav-lang-trigger"
                onClick={() => setLangOpen(v => !v)}
                aria-label="Language selector"
              >
                <img
                  className="hnav-lang-flag"
                  src={getFlagUrl(currentLang?.code || 'en')}
                  alt={currentLang?.code}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = currentLang?.flag_emoji || '🌐';
                      parent.style.fontSize = '20px';
                    }
                  }}
                />
              </button>
              {langOpen && (
                <div className="hnav-lang-dropdown">
                  {languages.map(l => (
                    <button
                      key={l.code}
                      className={`hnav-lang-option ${l.code === currentLanguage ? 'active' : ''}`}
                      onClick={() => handleLangChange(l.code)}
                    >
                      <img
                        className="hnav-lang-option-flag"
                        src={getFlagUrl(l.code)}
                        alt={l.code}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const emoji = document.createElement('span');
                            emoji.textContent = l.flag_emoji || '🌐';
                            emoji.style.fontSize = '20px';
                            parent.insertBefore(emoji, target);
                          }
                        }}
                      />
                      <span className="hnav-lang-option-text">{l.native_name || l.name || l.code.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button className="hnav-burger" aria-label="Menu" onClick={() => setMenuOpen(v => !v)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="hnav-sheet" role="dialog" aria-modal="true">
          <div className="hnav-sheet-list">
            {items.map(it => (
              <button
                key={it.id}
                className={`hnav-sheet-link ${active === it.id ? 'active' : ''}`}
                onClick={() => onGo(it.id)}
                aria-current={active === it.id ? 'page' : undefined}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
