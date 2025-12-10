// apps/client/src/components/landing/section/GalleryPremiumSection.tsx
import { useMemo, useState } from 'react';
import { getUIString } from '../../../utils/i18n';

type Theme = {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  text_color?: string;
  background_color?: string;
  font_accent?: string;
};

type GalleryItem = {
  id: string;
  image_url: string;
  alt?: string;
  title?: string;
  description?: string;
  category?: string;
  is_featured?: boolean;
};

type GalleryConfig = {
  variant?: 'grid' | 'masonry';
  columns?: number;          // 2–5
  max_images?: number;       // 4–20
  aspect_ratio?: 'square' | 'portrait' | 'landscape';
  gap?: 'none' | 'small' | 'medium' | 'large';
  show_captions?: boolean;
  lightbox_enabled?: boolean;
  filter_by_featured?: boolean;
};

type Props = {
  theme?: Theme;
  translations?: any;
  config?: GalleryConfig;
  items?: GalleryItem[];     // Imágenes ya resueltas desde BD (landing + media)
  ui?: Record<string, string>; // ✅ NUEVO
  currentLanguage?: string; // ✅ NUEVO
};

const hexToRgba = (hex: string, a = 1) => {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.slice(0, 2) || '00', 16);
  const g = parseInt(h.slice(2, 4) || '00', 16);
  const b = parseInt(h.slice(4, 6) || '00', 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const autoContrast = (hex: string) => {
  const h = (hex || '#111111').replace('#', '');
  const r = parseInt(h.slice(0, 2) || '11', 16);
  const g = parseInt(h.slice(2, 4) || '11', 16);
  const b = parseInt(h.slice(4, 6) || '11', 16);
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y > 155 ? '#0D1514' : '#F7F5F0';
};

export default function GalleryPremiumSection({
  theme,
  translations,
  config,
  items = [],
  ui,
  currentLanguage: _currentLanguage = 'es',
}: Props) {
  const BRAND_BG = theme?.background_color || '#071412';
  const BRAND_SURFACE = theme?.primary_color || '#102622';
  const BRAND_ACCENT = theme?.accent_color || theme?.secondary_color || '#D6AA52';
  const TEXT_COLOR = theme?.text_color || autoContrast(BRAND_BG);
  const FONT_HEAD =
    theme?.font_accent ||
    '"Fraunces Variable","Fraunces","Playfair Display","Times New Roman",serif';

  // Config por defecto (alineado con landingsectionlibrary.gallery)
  const cfg: Required<GalleryConfig> = {
    variant: config?.variant || 'grid',
    columns: Math.min(Math.max(config?.columns || 3, 2), 5),
    max_images: Math.min(Math.max(config?.max_images || 9, 4), 24),
    aspect_ratio: config?.aspect_ratio || 'square',
    gap: config?.gap || 'small',
    show_captions: config?.show_captions ?? false,
    lightbox_enabled: config?.lightbox_enabled ?? true,
    filter_by_featured: config?.filter_by_featured ?? true,
  };

  const processedItems = useMemo(() => {
    let list = [...items];

    if (cfg.filter_by_featured) {
      const featured = list.filter((it) => it.is_featured);
      if (featured.length > 0) list = featured;
    }

    list = list.slice(0, cfg.max_images);
    return list;
  }, [items, cfg.filter_by_featured, cfg.max_images]);

  const [active, setActive] = useState<GalleryItem | null>(null);

  const aspectValue =
    cfg.aspect_ratio === 'portrait'
      ? '3 / 4'
      : cfg.aspect_ratio === 'landscape'
        ? '4 / 3'
        : '1 / 1';

  const gapValue =
    cfg.gap === 'none'
      ? '0px'
      : cfg.gap === 'medium'
        ? '18px'
        : cfg.gap === 'large'
          ? '26px'
          : '12px';

  const styles = `
    .gallery-prem-root{
      position:relative;
      padding:clamp(56px, 7vw, 84px) clamp(18px, 4vw, 32px);
      background: radial-gradient(circle at top left, ${hexToRgba(
    BRAND_ACCENT,
    0.12,
  )} 0, transparent 55%), ${BRAND_BG};
      color:${TEXT_COLOR};
      overflow:hidden;
    }

    .gallery-prem-inner{
      max-width:1180px;
      margin:0 auto;
      position:relative;
      z-index:1;
    }

    .gallery-prem-header{
      text-align:center;
      margin:0 auto clamp(28px, 4vw, 40px);
      max-width:620px;
    }

    .gallery-prem-badge{
      display:inline-flex;
      align-items:center;
      gap:10px;
      padding:4px 14px;
      border-radius:999px;
      border:1px solid ${hexToRgba(BRAND_ACCENT, 0.7)};
      color:${BRAND_ACCENT};
      font-size:11px;
      letter-spacing:0.22em;
      text-transform:uppercase;
    }
    .gallery-prem-badge span:nth-of-type(2){
      width:16px;
      height:1px;
      background:${hexToRgba(BRAND_ACCENT, 0.65)};
    }

    .gallery-prem-title{
      margin:14px 0 6px;
      font-family:${FONT_HEAD};
      font-size:clamp(24px, 4vw, 34px);
      font-weight:500;
      letter-spacing:0.06em;
      text-transform:uppercase;
    }

    .gallery-prem-sub{
      margin:0;
      font-size:14px;
      line-height:1.7;
      color:${hexToRgba(TEXT_COLOR, 0.82)};
    }

    /* Grid / Masonry */
    .gallery-prem-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));
      gap:${gapValue};
    }

    @media(min-width:768px){
      .gallery-prem-grid.variant-grid{
        grid-template-columns:repeat(${cfg.columns}, minmax(0, 1fr));
      }
    }

    /* Item */
    .gallery-prem-item{
      position:relative;
      border-radius:18px;
      overflow:hidden;
      background:${BRAND_SURFACE};
      box-shadow:0 14px 40px ${hexToRgba('#000', 0.35)};
      cursor:pointer;
      isolation:isolate;
      transform:translateY(0);
      transition:transform 0.28s ease, box-shadow 0.28s ease, border 0.28s ease;
      border:1px solid ${hexToRgba('#FFFFFF', 0.04)};
    }

    .gallery-prem-item::before{
      content:"";
      position:absolute;
      inset:1px;
      border-radius:16px;
      background:radial-gradient(circle at top, ${hexToRgba(
    BRAND_ACCENT,
    0.15,
  )} 0, transparent 55%);
      mix-blend-mode:soft-light;
      opacity:0;
      transition:opacity 0.25s ease;
      z-index:1;
      pointer-events:none;
    }

    .gallery-prem-media{
      position:relative;
      aspect-ratio:${aspectValue};
      overflow:hidden;
    }

    .gallery-prem-media img{
      width:100%;
      height:100%;
      object-fit:cover;
      display:block;
      transform:scale(1.02);
      transition:transform 0.4s ease;
    }

    .gallery-prem-overlay{
      position:absolute;
      inset:0;
      background:linear-gradient(to top, ${hexToRgba(
    '#000000',
    0.78,
  )} 0, ${hexToRgba('#000000', 0.2)} 40%, transparent 80%);
      display:flex;
      flex-direction:column;
      justify-content:flex-end;
      padding:16px 16px 14px;
      opacity:0;
      transform:translateY(10px);
      transition:opacity 0.28s ease, transform 0.28s ease;
      z-index:2;
    }

    .gallery-prem-chip-row{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:8px;
      margin-bottom:6px;
      font-size:11px;
      text-transform:uppercase;
      letter-spacing:0.16em;
      color:${hexToRgba('#FFFFFF', 0.85)};
    }

    .gallery-prem-chip{
      padding:3px 10px;
      border-radius:999px;
      background:${hexToRgba(BRAND_ACCENT, 0.85)};
      color:#111;
      font-weight:600;
    }

    .gallery-prem-count{
      padding:3px 8px;
      border-radius:999px;
      border:1px solid ${hexToRgba('#FFFFFF', 0.35)};
      color:${hexToRgba('#FFFFFF', 0.9)};
    }

    .gallery-prem-cap-title{
      margin:0 0 2px;
      font-family:${FONT_HEAD};
      font-size:15px;
      letter-spacing:0.04em;
      text-transform:uppercase;
      color:#FFFFFF;
    }

    .gallery-prem-cap-desc{
      margin:0;
      font-size:12px;
      color:${hexToRgba('#FFFFFF', 0.8)};
      max-height:2.6em;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .gallery-prem-item:hover{
      transform:translateY(-6px);
      box-shadow:0 18px 54px ${hexToRgba('#000', 0.5)};
      border-color:${hexToRgba(BRAND_ACCENT, 0.8)};
    }
    .gallery-prem-item:hover .gallery-prem-media img{
      transform:scale(1.08);
    }
    .gallery-prem-item:hover .gallery-prem-overlay{
      opacity:1;
      transform:translateY(0);
    }
    .gallery-prem-item:hover::before{
      opacity:1;
    }

    /* Fallback caption (grid sin overlay) */
    .gallery-prem-meta{
      padding:10px 12px 13px;
      border-top:1px solid ${hexToRgba('#FFFFFF', 0.08)};
      font-size:12px;
      color:${hexToRgba(TEXT_COLOR, 0.82)};
      display:flex;
      flex-direction:column;
      gap:3px;
    }
    .gallery-prem-meta-title{
      font-family:${FONT_HEAD};
      letter-spacing:0.08em;
      text-transform:uppercase;
      font-size:12px;
    }

    /* Lightbox */
    .gallery-prem-lightbox{
      position:fixed;
      inset:0;
      z-index:1400;
      display:flex;
      align-items:center;
      justify-content:center;
      background:radial-gradient(circle at top, ${hexToRgba(
    BRAND_ACCENT,
    0.3,
  )} 0, ${hexToRgba('#000000', 0.9)} 55%);
      padding:24px;
    }

    .gallery-prem-lightbox-inner{
      max-width:1000px;
      width:100%;
      max-height:100%;
      border-radius:18px;
      overflow:hidden;
      background:${BRAND_SURFACE};
      box-shadow:0 24px 80px ${hexToRgba('#000', 0.7)};
      position:relative;
      display:flex;
      flex-direction:column;
    }

    .gallery-prem-lightbox-media{
      flex:1;
      background:#000;
      display:flex;
      align-items:center;
      justify-content:center;
    }

    .gallery-prem-lightbox-media img{
      max-width:100%;
      max-height:100%;
      object-fit:contain;
      display:block;
    }

    .gallery-prem-lightbox-info{
      padding:16px 18px 18px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:16px;
      color:${hexToRgba(TEXT_COLOR, 0.92)};
      font-size:13px;
    }

    .gallery-prem-lightbox-info h3{
      margin:0 0 4px;
      font-family:${FONT_HEAD};
      text-transform:uppercase;
      letter-spacing:0.12em;
      font-size:12px;
    }

    .gallery-prem-lightbox-close{
      position:absolute;
      right:14px;
      top:14px;
      width:34px;
      height:34px;
      border-radius:999px;
      border:1px solid ${hexToRgba('#FFFFFF', 0.3)};
      background:${hexToRgba('#000000', 0.45)};
      color:#FFF;
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      backdrop-filter:blur(4px);
      transition:all 0.22s ease;
    }

    .gallery-prem-lightbox-close:hover{
      background:${BRAND_ACCENT};
      color:#111;
      transform:translateY(-1px);
      box-shadow:0 8px 24px ${hexToRgba('#000', 0.7)};
    }

    @media(max-width:599px){
      .gallery-prem-lightbox{
        padding:14px;
      }
      .gallery-prem-lightbox-info{
        flex-direction:column;
        align-items:flex-start;
      }
    }
  `;

  const title = translations?.gallery_title || getUIString(ui, 'gallery_fallback_title', 'Moments from our table');
  const subtitle = translations?.gallery_subtitle || getUIString(ui, 'gallery_fallback_subtitle', 'Discover the ambience, plating and little details that make every visit memorable.');

  const handleClick = (item: GalleryItem) => {
    if (!cfg.lightbox_enabled) return;
    setActive(item);
  };

  const itemsWithIndex = processedItems.map((item, idx) => ({
    ...item,
    index: idx + 1,
    total: processedItems.length,
  }));

  return (
    <section className="gallery-prem-root" aria-label="Gallery section">
      <style>{styles}</style>
      <div className="gallery-prem-inner">
        <header className="gallery-prem-header">
          <div className="gallery-prem-badge">
            <span>✦</span>
            <span />
            <span>{translations?.gallery_badge || 'GALLERY'}</span>
          </div>
          <h2 className="gallery-prem-title">{title}</h2>
          <p className="gallery-prem-sub">{subtitle}</p>
        </header>

        <div
          className={
            'gallery-prem-grid ' + (cfg.variant === 'grid' ? 'variant-grid' : 'variant-masonry')
          }
        >
          {itemsWithIndex.map((item) => {
            const hasCaption = cfg.show_captions || item.title || item.description;
            return (
              <article
                key={item.id}
                className="gallery-prem-item"
                onClick={() => handleClick(item)}
              >
                <div className="gallery-prem-media">
                  <img src={item.image_url} alt={item.alt || item.title || ''} loading="lazy" />
                  <div className="gallery-prem-overlay">
                    {(item.title || item.description) && (
                      <>
                        {item.title && (
                          <h3 className="gallery-prem-cap-title">{item.title}</h3>
                        )}
                        {item.description && cfg.show_captions && (
                          <p className="gallery-prem-cap-desc">{item.description}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {hasCaption && (
                  <div className="gallery-prem-meta">
                    {item.title && (
                      <div className="gallery-prem-meta-title">
                        {item.title}
                      </div>
                    )}
                    {cfg.show_captions && item.description && (
                      <div>{item.description}</div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {active && cfg.lightbox_enabled && (
        <div
          className="gallery-prem-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
        >
          <div
            className="gallery-prem-lightbox-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="gallery-prem-lightbox-close"
              type="button"
              aria-label="Close"
              onClick={() => setActive(null)}
            >
              ✕
            </button>
            <div className="gallery-prem-lightbox-media">
              <img
                src={active.image_url}
                alt={active.alt || active.title || ''}
                loading="lazy"
              />
            </div>
            {(active.title || active.description) && (
              <div className="gallery-prem-lightbox-info">
                <div>
                  {active.title && <h3>{active.title}</h3>}
                  {active.description && <p>{active.description}</p>}
                </div>
                {active.category && <span>{active.category}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
