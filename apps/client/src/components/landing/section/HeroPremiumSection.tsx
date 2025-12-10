import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getConfigText } from '../../../utils/i18n';

type Props = {
  restaurant?: any;
  translations?: any;
  theme?: any;
  variant?: 'fullscreen' | 'centered' | 'split' | 'video';
  config?: any;
  restaurant_media?: any;
  assets?: { landing_pattern_url?: string };
  ui?: Record<string, string>; // ✅ NUEVO: UI strings traducidos
  currentLanguage?: string; // ✅ NUEVO: Idioma actual
};

export default function HeroPremiumSection({
  restaurant,
  translations,
  theme,
  variant = 'fullscreen',
  config,
  restaurant_media,
  assets,
  ui,
  currentLanguage = 'es',
}: Props) {
  const BRAND_PRIMARY =
    theme?.background_color ?? theme?.primary_color ?? theme?.backgroundcolor ?? theme?.primarycolor ?? '#143733';
  const BRAND_ACCENT =
    theme?.accent_color ?? theme?.secondary_color ?? theme?.accentcolor ?? theme?.secondarycolor ?? '#D6AA52';
  const TEXT_COLOR = theme?.text_color ?? theme?.textcolor ?? '#F2F4F3';
  const FONT_HEAD =
    theme?.font_accent ?? theme?.fontaccent ?? '"Fraunces Variable","Fraunces",Georgia,"Times New Roman",serif';

  let cfg: any = config;
  if (typeof cfg === 'string') { try { cfg = JSON.parse(cfg); } catch { cfg = {}; } }
  cfg = cfg || {};
  // const _height = cfg.height ?? '50vh';
  const textAlign = cfg.textalign ?? cfg.text_align ?? 'center';

  // ✅ ACTUALIZADO: Usar getConfigText con fallback a UI strings
  const title = getConfigText(
    cfg,
    'title_override',
    currentLanguage,
    'hero_fallback_title',
    ui,
    restaurant?.name || 'Delightful Experience'
  );

  const subtitle = getConfigText(
    cfg,
    'subtitle_override',
    currentLanguage,
    'hero_fallback_subtitle',
    ui,
    translations?.short_description ||
    translations?.shortdescription ||
    restaurant?.description ||
    'A taste of perfection in every dish - fine dining with a modern twist.'
  );

  const placeholder = 'https://placehold.co/600x400/EEE/31343C';
  const cover =
    restaurant_media?.hero_slides?.[0]?.image_url ||
    cfg.backgroundmedia || cfg.background_media ||
    restaurant?.cover_image_url || restaurant?.coverimageurl ||
    placeholder;

  const slides = useMemo(() => {
    if (Array.isArray(cfg.slides) && cfg.slides.length) {
      return cfg.slides.map((s: any) => ({ url: s.url || s, alt: s.alt || restaurant?.name || 'Slide' }));
    }
    if (Array.isArray(restaurant_media?.hero_slides) && restaurant_media.hero_slides.length) {
      return restaurant_media.hero_slides.map((s: any) => ({ url: s.image_url, alt: s.alt || restaurant?.name || 'Slide' }));
    }
    return [{ url: cover, alt: restaurant?.name || 'Slide' }];
  }, [cfg.slides, restaurant_media?.hero_slides, cover, restaurant?.name]);

  const [idx, setIdx] = useState(0);
  const go = (d: -1 | 1) => setIdx(p => (p + d + slides.length) % slides.length);
  const media = slides[idx]?.url || placeholder;

  const autoplayMs = Number(cfg.autoplay_ms ?? 0);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!autoplayMs || slides.length < 2) return;
    timer.current = window.setInterval(() => setIdx(p => (p + 1) % slides.length), autoplayMs);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [autoplayMs, slides.length]);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1);
    touch.current = null;
  };

  const patternUrl = cfg.pattern_url || cfg.background_pattern_url || assets?.landing_pattern_url || '';
  const patternSize = Number(cfg.pattern_size ?? 160);
  const patternOpacity = Number(cfg.pattern_opacity ?? 0.12);
  const patternBlend = cfg.pattern_blend_mode || 'soft-light';

  // ✅ PREFIJO ÚNICO: .hero-prem-*
  const css = `
    :root{ --hero-prem-archRadius: 500px; --hero-prem-pillPad: 8px; }
    .hero-prem-root{ 
      position:relative; 
      background-image:url('${patternUrl}'); 
      background-color: ${BRAND_PRIMARY};
      min-height:50vh; 
      color:${TEXT_COLOR};
      overflow:hidden; 
      padding:56px 14px 64px; 
      display:grid; 
      grid-template-rows:auto 1fr; 
    }
    .hero-prem-root::after{
      content:""; 
      position:absolute; 
      inset:0; 
      pointer-events:none; 
      z-index:0;
      ${patternUrl ? `background-image:url('${patternUrl}');` : ''}
      background-repeat:repeat;
      background-size:${patternSize}px auto;
      background-position:center top;
      opacity:${patternOpacity};
      mix-blend-mode:${patternBlend};
    }
    .hero-prem-inner{ 
      max-width:1280px; 
      margin:0 auto; 
      width:100%; 
      position:relative; 
      z-index:1; 
    }
    .hero-prem-head{ 
      text-align:${textAlign}; 
      margin-bottom:18px; 
    }
    .hero-prem-title{ 
      font-family:${FONT_HEAD}; 
      font-size:clamp(28px,8vw,44px); 
      line-height:1.08; 
      font-weight:400; 
      margin:0; 
      color:#F5F2EA; 
    }
    .hero-prem-subtitle{ 
      font-family:${FONT_HEAD}; 
      font-weight:200; 
      margin:12px auto 0; 
      max-width:560px; 
      font-size:12px; 
      line-height:1.7; 
      color:rgba(255,255,255,.9); 
    }
    .hero-prem-frame{ 
      position:relative; 
      margin:22px auto 0; 
      width:92vw; 
      max-width:360px; 
      aspect-ratio:4/3;
      padding:var(--hero-prem-pillPad); 
      background:#0E2422; 
      border-radius:var(--hero-prem-archRadius) var(--hero-prem-archRadius) 0 0;
      box-shadow:0 10px 32px rgba(0,0,0,.35), inset 0 0 0 1px rgba(0,0,0,.35); 
    }
    .hero-prem-frame::before{ 
      content:""; 
      position:absolute; 
      inset:calc(var(--hero-prem-pillPad) - 4px);
      border-radius:var(--hero-prem-archRadius) var(--hero-prem-archRadius) 0 0; 
      border:2px solid ${BRAND_ACCENT}; 
      pointer-events:none; 
    }
    .hero-prem-media{ 
      position:absolute; 
      inset:calc(var(--hero-prem-pillPad) + 4px);
      border-radius:var(--hero-prem-archRadius) var(--hero-prem-archRadius) 0 0; 
      overflow:hidden; 
      background:#0b1c1a; 
    }
    .hero-prem-img,
    .hero-prem-vid{ 
      width:100%; 
      height:100%; 
      object-fit:cover; 
      object-position:center; 
    }
    .hero-prem-nav{ display:none; }
    @media (min-width:768px){
      .hero-prem-root{ padding:64px 20px 84px; }
      .hero-prem-title{ font-size:clamp(42px,6vw,68px); }
      .hero-prem-subtitle{ max-width:760px; font-size:17px; }
      .hero-prem-frame{ 
        width:min(860px,86vw); 
        max-width:unset; 
        aspect-ratio:16/8.2; 
        border-radius:2000px; 
        padding:12px; 
      }
      .hero-prem-frame::before{ inset:6px; border-radius:2000px; }
      .hero-prem-media{ inset:14px; border-radius:2000px; }
      .hero-prem-nav{ 
        display:grid; 
        place-items:center; 
        position:absolute; 
        top:50%; 
        transform:translateY(-50%);
        width:44px; 
        height:44px; 
        border-radius:999px; 
        background:#153E3A; 
        border:2px solid ${BRAND_ACCENT};
        color:#EAE6DB; 
        box-shadow:0 8px 20px rgba(0,0,0,.25); 
        cursor:pointer; 
        z-index:2; 
      }
      .hero-prem-prev{ left:18px; } 
      .hero-prem-next{ right:18px; }
    }
    @media (min-width:1024px){
      .hero-prem-root{ padding:72px 24px 96px; }
      .hero-prem-title{ font-size:clamp(56px,5vw,78px); }
      .hero-prem-subtitle{ font-size:18px; }
      .hero-prem-frame{ width:min(1180px,92vw); aspect-ratio:16/7.2; }
    }
    @keyframes fadeIn { 
      from { opacity: 0; } 
      to { opacity: 1; } 
    }
    .fade-in { 
      animation: fadeIn 0.8s ease-in-out; 
    }
  `;

  const Media = (
    <div className="hero-prem-frame" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="hero-prem-media">
        {String(media).toLowerCase().endsWith('.mp4') ? (
          <video
            key={media}
            className="hero-prem-vid fade-in"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src={media} type="video/mp4" />
          </video>
        ) : (
          <img
            key={media}
            className="hero-prem-img fade-in"
            src={media}
            alt={slides[idx]?.alt || restaurant?.name || 'Hero'}
          />
        )}
      </div>
      {slides.length > 1 && (
        <>
          <button className="hero-prem-nav hero-prem-prev" aria-label="Previous" onClick={() => go(-1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="hero-prem-nav hero-prem-next" aria-label="Next" onClick={() => go(1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
    </div>
  );

  const Split = (
    <div style={{ display: 'grid', gap: 24, alignItems: 'center', margin: '0 auto', maxWidth: 1180 }}>
      <div style={{ order: 2, textAlign: textAlign as any }}>
        <h2 className="hero-prem-title" style={{ fontSize: 32, marginBottom: 8 }}>{title}</h2>
        <p className="hero-prem-subtitle" style={{ margin: 0 }}>{subtitle}</p>
      </div>
      <div style={{ order: 1 }}>{Media}</div>
    </div>
  );

  return (
    <section className="hero-prem-root" aria-label="Hero">
      <style>{css}</style>
      <div className="hero-prem-inner">
        <header className="hero-prem-head">
          <h1 className="hero-prem-title">{title}</h1>
          <p className="hero-prem-subtitle">{subtitle}</p>
        </header>
        {variant === 'split' ? Split : Media}
      </div>
    </section>
  );
}
