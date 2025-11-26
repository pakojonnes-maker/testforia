// src/components/landing/section/MenuVideoGallerySection.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Theme = {
  background_color?: string;
  text_color?: string;
  accent_color?: string;
  secondary_color?: string;
  primary_color?: string;
  font_accent?: string;
};

type PremiumData = {
  title?: string | null;
  videos?: Array<{
    src: string | null;
    poster?: string | null;
    href?: string | null;
    title?: string;
    hasVideo?: boolean;
  }>;
  per_page?: { desktop?: number; tablet?: number; mobile?: number };
  autoplay_on_hover?: boolean;
  loop?: boolean;
  show_dots?: boolean;
};

type Props = {
  theme?: Theme;
  translations?: Record<string, string>;
  premium?: PremiumData;
  apiUrl?: string;
};

type MenuItem = {
  id: string;
  src?: string;
  poster?: string;
  href?: string;
  title: string;
  hasVideo: boolean;
};

const hexToRgba = (hex: string, a = 1) => {
  const h = (hex || '#000').replace('#', '');
  const r = parseInt(h.slice(0, 2) || '00', 16);
  const g = parseInt(h.slice(2, 4) || '00', 16);
  const b = parseInt(h.slice(4, 6) || '00', 16);
  return `rgba(${r},${g},${b},${a})`;
};

const autoContrast = (hex: string) => {
  const h = (hex || '#fff').replace('#', '');
  const r = parseInt(h.slice(0, 2) || 'ff', 16);
  const g = parseInt(h.slice(2, 4) || 'ff', 16);
  const b = parseInt(h.slice(4, 6) || 'ff', 16);
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y > 155 ? '#161616' : '#F8F8F8';
};

const resolveUrl = (val?: string | null, apiUrl?: string) => {
  if (!val) return undefined;
  if (val.startsWith('http')) return val;
  const base = apiUrl || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';
  return `${base}/media/${val}`;
};

// NUEVO: Valida si un string es una imagen válida
const isImageUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
  return imageExts.some(ext => url.toLowerCase().endsWith(ext));
};

export default function MenuVideoGallerySection({ theme, translations, premium, apiUrl }: Props) {
  const bg = theme?.background_color || theme?.primary_color || '#0E2D27';
  const accent = theme?.accent_color || theme?.secondary_color || '#D6AA52';
  const txt = theme?.text_color || autoContrast(bg);
  const fontHead = theme?.font_accent || '"Fraunces Variable",Georgia,serif';

  useEffect(() => {
    console.log('[MenuVideoGallery] premium payload:', premium);
    console.log('[MenuVideoGallery] apiUrl:', apiUrl);
  }, [premium, apiUrl]);

  if (!premium) {
    console.error('[MenuVideoGallery] ❌ premium is undefined');
    return null;
  }

  const items: MenuItem[] = useMemo(() => {
    const raw = premium?.videos || [];
    console.log('[MenuVideoGallery] raw videos:', raw);
    
    if (!raw.length) {
      console.warn('[MenuVideoGallery] ⚠️ No videos found');
      return [];
    }
    
    return raw.map((v, i) => {
      const resolvedPoster = resolveUrl(v.poster, apiUrl);
      // Si poster no es imagen válida, usar placeholder
      const posterUrl = isImageUrl(resolvedPoster) 
        ? resolvedPoster 
        : `https://placehold.co/1280x720/${bg.replace('#', '')}/${accent.replace('#', '')}?text=${encodeURIComponent(v.title || `Menu ${i + 1}`)}`;
      
      return {
        id: `menu-${i}`,
        src: resolveUrl(v.src, apiUrl),
        poster: posterUrl,
        href: v.href || undefined,
        title: v.title || `Menu ${i + 1}`,
        hasVideo: v.hasVideo ?? !!v.src,
      };
    });
  }, [premium, bg, accent, apiUrl]);

  const title = premium?.title || 'Menú del Chef';
  const subtitle = 'Elige un menú y descubre una experiencia visual y gastronómica';

  const autoplay = premium?.autoplay_on_hover ?? true;
  const loop = premium?.loop ?? true;
  const showDots = premium?.show_dots ?? true;

  const containerRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState(1);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const compute = () => {
      const w = containerRef.current?.offsetWidth || window.innerWidth;
      const mobile = premium?.per_page?.mobile ?? 1;
      const tablet = premium?.per_page?.tablet ?? 2;
      const desktop = premium?.per_page?.desktop ?? 3;
      let pp = mobile;
      if (w >= 768) pp = tablet;
      if (w >= 1024) pp = desktop;
      setPerPage(Math.min(pp, items.length || 1));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [premium, items.length]);

  useEffect(() => {
    setPage(0);
  }, [perPage, items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const goTo = useCallback((p: number) => setPage(Math.max(0, Math.min(totalPages - 1, p))), [totalPages]);
  const prev = useCallback(() => canPrev && setPage((p) => p - 1), [canPrev]);
  const next = useCallback(() => canNext && setPage((p) => p + 1), [canNext]);

  const startX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => (startX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 50) dx > 0 ? prev() : next();
  };

  const vRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting && v.dataset.src && !v.src) {
            v.src = v.dataset.src;
            v.load();
          }
        });
      },
      { rootMargin: '100px', threshold: 0.1 }
    );
    Object.values(vRefs.current).forEach((v) => v && io.observe(v));
    return () => io.disconnect();
  }, [items, page]);

  const startIdx = page * perPage;
  const endIdx = startIdx + perPage;
  const visibleItems = items.slice(startIdx, endIdx);

  const isSingle = items.length === 1;

  if (!items.length) {
    console.warn('[MenuVideoGallery] ⚠️ No items to display');
    return null;
  }

  const styles = `
.mvg-root{position:relative;background:${bg};color:${txt};padding:48px 16px 64px;overflow:hidden;}
.mvg-cnt{max-width:1280px;margin:0 auto;}
.mvg-head{text-align:center;margin-bottom:32px;}
.mvg-title{font-family:${fontHead};font-size:clamp(1.5rem,4vw,2.25rem);font-weight:700;margin:0 0 8px;}
.mvg-sub{font-size:0.95rem;opacity:.85;margin:0;}
.mvg-vp{position:relative;}
.mvg-grid{display:grid;gap:16px;grid-template-columns:repeat(${perPage},1fr);}
.mvg-card{position:relative;border-radius:12px;overflow:hidden;background:${hexToRgba(txt, 0.04)};border:1px solid ${hexToRgba(accent, 0.3)};box-shadow:0 4px 16px ${hexToRgba('#000', 0.2)};transition:all .3s ease;}
.mvg-card:hover{border-color:${hexToRgba(accent, 0.6)};transform:translateY(-4px);box-shadow:0 8px 24px ${hexToRgba('#000', 0.3)};}
.mvg-media{position:relative;aspect-ratio:16/9;background:${hexToRgba('#000', 0.85)};}
.mvg-video,.mvg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.mvg-link{position:absolute;inset:0;z-index:2;}
.mvg-over{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:space-between;padding:12px;background:linear-gradient(180deg,transparent 40%,${hexToRgba('#000', 0.5)} 100%);opacity:0;transition:opacity .25s;z-index:1;}
.mvg-card:hover .mvg-over{opacity:1;}
.mvg-chip{font-size:0.75rem;font-weight:700;color:${bg};background:${hexToRgba(accent, 0.95)};padding:5px 10px;border-radius:16px;text-transform:uppercase;letter-spacing:.4px;}
.mvg-cta{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:8px;border:1px solid ${hexToRgba('#fff', 0.7)};color:#fff;text-decoration:none;font-size:0.8rem;font-weight:600;backdrop-filter:blur(6px);background:${hexToRgba('#000', 0.25)};transition:all .2s;}
.mvg-cta:hover{background:${hexToRgba('#fff', 0.15)};border-color:${accent};}
.mvg-nav{display:flex;justify-content:space-between;margin-top:20px;}
.mvg-btn{width:40px;height:40px;border-radius:50%;border:1px solid ${hexToRgba(accent, 0.5)};background:${hexToRgba(bg, 0.85)};color:${txt};display:grid;place-items:center;cursor:pointer;transition:all .3s;box-shadow:0 2px 8px ${hexToRgba('#000', 0.2)};}
.mvg-btn:disabled{opacity:.3;cursor:not-allowed;}
.mvg-btn:not(:disabled):hover{background:${hexToRgba(accent, 0.9)};color:${bg};transform:scale(1.1);}
.mvg-dots{display:flex;gap:8px;justify-content:center;margin-top:16px;}
.mvg-dot{width:8px;height:8px;border-radius:50%;background:${hexToRgba(txt, 0.3)};border:1px solid ${hexToRgba(accent, 0.4)};cursor:pointer;transition:all .3s;}
.mvg-dot.active{background:${accent};transform:scale(1.2);}
.mvg-single .mvg-grid{grid-template-columns:1fr;max-width:min(880px,100%);margin:0 auto;}
@media(max-width:767px){.mvg-nav{display:none;}}
@media(min-width:768px) and (max-width:1023px){.mvg-grid{grid-template-columns:repeat(${Math.min(premium?.per_page?.tablet ?? 2, perPage)},1fr);}}
@media(min-width:1024px){.mvg-grid{grid-template-columns:repeat(${Math.min(premium?.per_page?.desktop ?? 3, perPage)},1fr);}}
`;

  return (
    <section className="mvg-root" aria-label="Featured menus gallery">
      <style>{styles}</style>
      <div className="mvg-cnt" ref={containerRef}>
        <header className="mvg-head">
          <h2 className="mvg-title">{title}</h2>
          <p className="mvg-sub">{subtitle}</p>
        </header>

        <div className={`mvg-vp ${isSingle ? 'mvg-single' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="mvg-grid">
            {visibleItems.map((item) => (
              <article key={item.id} className="mvg-card">
                <div className="mvg-media">
                  {item.href && <a className="mvg-link" href={item.href} aria-label={item.title} />}
                  
                  {item.hasVideo && item.src ? (
                    <video
                      ref={(el) => (vRefs.current[item.id] = el)}
                      className="mvg-video"
                      playsInline
                      muted
                      loop={loop}
                      preload="metadata"
                      poster={item.poster}
                      data-src={item.src}
                      onMouseEnter={(e) => {
                        if (autoplay) {
                          const vid = e.currentTarget as HTMLVideoElement;
                          if (!vid.src && vid.dataset.src) {
                            vid.src = vid.dataset.src;
                            vid.load();
                          }
                          vid.play().catch(() => {});
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (autoplay) {
                          const vid = e.currentTarget as HTMLVideoElement;
                          vid.pause();
                          vid.currentTime = 0;
                        }
                      }}
                      aria-label={item.title}
                    />
                  ) : (
                    <img
                      className="mvg-img"
                      src={item.poster}
                      alt={item.title}
                      loading="lazy"
                    />
                  )}
                  
                  <div className="mvg-over">
                    <span className="mvg-chip">{item.title}</span>
                    {item.href && (
                      <a className="mvg-cta" href={item.href}>
                        <span>Ver Menú</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {!isSingle && totalPages > 1 && (
            <div className="mvg-nav">
              <button className="mvg-btn" onClick={prev} disabled={!canPrev} aria-label="Anterior">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="mvg-btn" onClick={next} disabled={!canNext} aria-label="Siguiente">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {showDots && totalPages > 1 && (
          <div className="mvg-dots">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                className={`mvg-dot ${i === page ? 'active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Página ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
