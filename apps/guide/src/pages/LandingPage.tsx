// src/pages/LandingPage.tsx — Sales landing: Modern Mediterranean Editorial, mobile-first
//
// Reconstruida en ago 2026 a partir del export de Google Stitch en
// stitch_costa_digital_guidebook/ (dos pantallas — desktop y mobile — que
// divergían entre sí porque Stitch las generó en pasadas separadas). Este
// archivo fusiona ambas en una sola página coherente: se deduplican
// secciones que aparecían en una sola variante, se restauran las tildes que
// el export de Stitch perdió, y las imágenes de estilo de vida de Stitch
// (URLs efímeras de preview de Google, lh3.googleusercontent.com/aida-*) se
// sustituyen por <MediaPlaceholder>, el mismo patrón de "branded placeholder"
// que ya usa el resto de la guía en vez de hotlinkear assets que no son
// nuestros. Sistema visual: cobalto, Newsreader/Inter/Archivo Narrow/Space
// Mono, arcos, horizon rules, azulejo, stamped badges, sin sombras/esquinas
// redondeadas — ver apps/guide/src/index.css (@theme) y
// stitch_costa_digital_guidebook/modern_mediterranean_editorial/DESIGN.md.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import MediaPlaceholder from '../components/MediaPlaceholder';

// ---------- scroll-reveal ----------
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-7'}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}

// ---------- tilt card ----------
function TiltCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${py * -6}deg) rotateY(${px * 8}deg) translateY(-4px)`;
  };
  const handleLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`${className} [transition:transform_0.35s_ease]`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}

// ---------- count up ----------
function CountUp({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const duration = 1200;
    const start = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, to]);

  return (
    <div ref={ref} className="font-mono-badge text-[2.5rem] leading-none text-accent-gold">
      {prefix}{n}{suffix}
    </div>
  );
}

// ---------- sunburst decoration ----------
function Sunburst({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      {Array.from({ length: 24 }).map((_, i) => (
        <rect
          key={i}
          x="99"
          y="10"
          width="2"
          height="34"
          rx="1"
          fill="currentColor"
          transform={`rotate(${i * 15} 100 100)`}
        />
      ))}
    </svg>
  );
}

// ---------- coastal village skyline ----------
function CoastSkyline({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1400 200" className={className} aria-hidden="true" preserveAspectRatio="none">
      <g fill="currentColor">
        <path d="M40 90 L85 55 L130 90 Z" />
        <rect x="150" y="120" width="60" height="80" />
        <circle cx="180" cy="108" r="16" />
        <rect x="230" y="70" width="80" height="130" />
        <rect x="255" y="95" width="10" height="20" />
        <rect x="330" y="130" width="100" height="70" />
        <path d="M330 130 L380 100 L430 130 Z" />
        <rect x="460" y="100" width="55" height="100" />
        <rect x="540" y="115" width="120" height="85" />
        <circle cx="600" cy="103" r="20" />
        <rect x="695" y="80" width="70" height="120" />
        <path d="M695 80 L730 50 L765 80 Z" />
        <rect x="790" y="125" width="90" height="75" />
        <rect x="905" y="95" width="65" height="105" />
        <circle cx="937" cy="83" r="15" />
        <rect x="990" y="130" width="110" height="70" />
        <path d="M990 130 L1045 95 L1100 130 Z" />
        <rect x="1130" y="105" width="60" height="95" />
        <rect x="1210" y="120" width="95" height="80" />
        <circle cx="1257" cy="108" r="17" />
        <rect x="1330" y="90" width="70" height="110" />
      </g>
    </svg>
  );
}

// ---------- guidebook phone mockup ----------
function PhoneMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 scale-110 bg-white/10 blur-3xl" />

      <span className="absolute -left-8 top-6 z-10 flex animate-float-slow items-center gap-1.5 border border-on-background/10 bg-crisp-white/95 px-3.5 py-2 font-label-sm text-label-sm text-on-background">
        <span aria-hidden="true">⭐</span> 4,9 · huéspedes felices
      </span>
      <span className="absolute -right-6 bottom-24 z-10 flex animate-float-slower items-center gap-1.5 border border-on-background/10 bg-crisp-white/95 px-3.5 py-2 font-label-sm text-label-sm text-primary">
        🌍 13 idiomas
      </span>

      <div className="relative mx-auto w-[230px] rotate-3 rounded-[2.6rem] border-[10px] border-[#08243F] bg-[#08243F] transition-transform duration-500 hover:rotate-0 sm:w-[250px]">
        <div className="relative overflow-hidden rounded-[1.9rem] bg-crisp-white">
          <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-xl bg-[#08243F]" />

          <div className="relative h-40 w-full bg-gradient-to-br from-primary via-[#1a4fd8] to-accent-gold">
            <div className="absolute inset-0 bg-on-background/10" />
            <span className="absolute right-3 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/25">
              <span className="material-symbols-outlined text-base text-white">play_arrow</span>
            </span>
            <div className="absolute bottom-3 left-3 right-3">
              <div className="h-2 w-28 bg-white/70" />
              <div className="mt-1.5 h-1.5 w-16 bg-white/50" />
            </div>
          </div>

          <div className="flex gap-1.5 px-3 pt-3">
            {['ES', 'EN', 'FR', 'DE'].map((c) => (
              <span key={c} className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-variant font-mono-badge text-[9px] text-on-surface-variant">
                {c}
              </span>
            ))}
            <span className="flex h-6 items-center rounded-full bg-primary/10 px-2 text-[10px] font-label-sm text-primary">+9</span>
          </div>

          <div className="space-y-2 px-3 py-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-2 bg-surface-container p-2">
                <div className="h-8 w-8 flex-none bg-gradient-to-br from-secondary/40 to-secondary/70" />
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 w-3/4 rounded-full bg-on-surface-variant/30" />
                  <div className="h-1.5 w-1/2 rounded-full bg-on-surface-variant/20" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-around border-t border-black/5 px-3 py-2.5">
            {['home', 'restaurant', 'explore', 'chat_bubble'].map((ic, i) => (
              <span key={ic} className={`material-symbols-outlined text-lg ${i === 0 ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                {ic}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- language chip (idiomas section, sobre fondo oscuro) ----------
function LangChip({ code }: { code: string }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-on-primary/20 bg-white/10 font-mono-badge text-[13px] text-on-primary">
      {code}
    </div>
  );
}

// ---------- chatbot phone mockup ----------
function ChatMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`w-full max-w-[280px] border border-on-background/10 bg-surface p-4 bg-grain ${className}`}>
      <div className="flex items-center gap-2 border-b border-on-background/10 pb-3">
        <div className="flex h-8 w-8 flex-none items-center justify-center bg-primary text-on-primary">
          <span className="material-symbols-outlined text-base">support_agent</span>
        </div>
        <div>
          <div className="font-label-caps text-label-caps text-on-background">ASISTENTE VIRTUAL</div>
          <div className="font-body-md text-[11px] text-primary">En línea</div>
        </div>
      </div>
      <div className="flex flex-col gap-3 py-4">
        <div className="max-w-[85%] self-end border border-primary/20 bg-primary/10 p-3">
          <p className="font-body-md text-[14px] text-on-background">¿A qué hora es el check-out?</p>
        </div>
        <div className="max-w-[85%] self-start border border-on-background/10 bg-surface-container-lowest p-3">
          <p className="font-body-md text-[14px] text-on-background">
            El check-out es a las 11:00. ¿Necesitas ayuda con el transporte al aeropuerto?
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-on-background/10 pt-3">
        <div className="flex h-9 flex-1 items-center border border-on-background/15 px-3">
          <span className="font-body-md text-[12px] text-on-surface-variant/70">Escribe un mensaje...</span>
        </div>
        <div className="flex h-9 w-9 flex-none items-center justify-center bg-primary text-on-primary">
          <span className="material-symbols-outlined text-base">send</span>
        </div>
      </div>
    </div>
  );
}

// ---------- VisualTaste TV mockup ----------
function TvMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-grain flex aspect-video w-full items-center justify-between gap-6 border border-on-primary/15 bg-black p-6 sm:p-10 ${className}`}>
      <div className="flex flex-col gap-4 text-white">
        <h3 className="font-display-lg text-[1.5rem] sm:text-[2rem]">Villa Azul</h3>
        <div className="space-y-1 font-mono-badge text-[11px] text-white/70 sm:text-[13px]">
          <p>RED: VillaAzul_5G</p>
          <p>CLAVE: ········</p>
        </div>
      </div>
      <div className="hidden h-28 w-28 flex-none items-center justify-center border border-white/20 bg-white/5 sm:flex">
        <span className="material-symbols-outlined text-4xl text-white/60">qr_code_2</span>
      </div>
    </div>
  );
}

// ---------- agency dashboard mockup ----------
function DashboardMockup({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-5 border border-on-background/10 bg-surface-container-lowest p-6 ${className}`}>
      <div className="flex gap-4 overflow-x-auto border-b border-on-background/10 pb-4">
        <span className="whitespace-nowrap border-b-2 border-primary pb-1 font-body-md text-body-md font-semibold text-primary">Villa Azul</span>
        <span className="whitespace-nowrap font-body-md text-body-md text-on-surface-variant">Loft Centro</span>
        <span className="whitespace-nowrap font-body-md text-body-md text-on-surface-variant">Casa del Mar</span>
      </div>
      <div className="grid grid-cols-3 gap-4 border-b border-on-background/10 pb-4">
        <div>
          <p className="mb-1 font-label-caps text-label-caps text-on-surface-variant">ESCANEOS</p>
          <p className="font-mono-badge text-[22px] text-on-background">1.240</p>
        </div>
        <div>
          <p className="mb-1 font-label-caps text-label-caps text-on-surface-variant">RESERVAS</p>
          <p className="font-mono-badge text-[22px] text-on-background">18</p>
        </div>
        <div>
          <p className="mb-1 font-label-caps text-label-caps text-on-surface-variant">SATISFACCIÓN</p>
          <p className="font-mono-badge text-[22px] text-on-background">4,9</p>
        </div>
      </div>
      <div className="relative h-32 w-full overflow-hidden border border-on-background/5 bg-surface-container/40">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d="M0,80 L20,60 L40,70 L60,30 L80,40 L100,20" fill="none" stroke="#0038AE" strokeWidth="2" />
        </svg>
        <div className="absolute right-2 top-[16%] h-3 w-3 rounded-full border-2 border-surface-container-lowest bg-accent-gold" />
      </div>
    </div>
  );
}

// ---------- FAQ accordion ----------
function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="border-t border-on-background/10">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.q} className="border-b border-on-background/10">
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="font-headline-md text-[19px] text-on-background">{item.q}</span>
              <span className="material-symbols-outlined shrink-0 text-on-surface-variant">{open ? 'remove' : 'add'}</span>
            </button>
            {open && (
              <p className="pb-6 pr-8 font-body-md text-body-md text-on-surface-variant">{item.a}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const CONTACT_MAILTO = 'mailto:info@visualtastes.com?subject=Demo%20VisualTastes%20Guidebook';

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement | null>(null);

  const handleHeroMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  // SEO: esta es una SPA con un único index.html compartido por landing,
  // /legal y /:slug (guidebook real de cada huésped) — no hay que pisar el
  // <title>/meta description por defecto para esas otras rutas. Se captura
  // el valor original antes de sobrescribir y se restaura al desmontar.
  useEffect(() => {
    const prevTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const prevDescription = metaDescription?.getAttribute('content') ?? null;

    document.title = 'Guía digital para apartamentos turísticos | VisualTastes Guidebook';
    metaDescription?.setAttribute(
      'content',
      'Guidebook digital con QR para apartamentos turísticos: WiFi, normas, mapa, restaurantes y chatbot IA en 13 idiomas. Menos mensajes, mejores reseñas.'
    );

    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.id = 'landing-schema';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          name: 'VisualTastes Guidebook',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description:
            'Guía digital para apartamentos turísticos: información del piso, mapa de puntos de interés, restaurantes con carta visual, chatbot IA y traducción automática a 13 idiomas.',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
          url: 'https://guide.visualtastes.com/',
        },
        {
          '@type': 'FAQPage',
          mainEntity: FAQ_ITEMS.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        },
      ],
    });
    document.head.appendChild(schema);

    return () => {
      document.title = prevTitle;
      if (prevDescription !== null) metaDescription?.setAttribute('content', prevDescription);
      document.getElementById('landing-schema')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-on-surface">
      {/* ============ HEADER ============ */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-20 items-center justify-between border-b border-on-background/10 bg-surface/95 px-5 backdrop-blur-sm md:px-16">
        <span className="font-display-lg text-headline-sm text-primary">VisualTastes</span>
        <a
          href={CONTACT_MAILTO}
          className="bg-primary px-5 py-2.5 font-label-caps text-label-caps uppercase text-on-primary transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Empieza ya
        </a>
      </header>

      {/* ============ HERO ============ */}
      <div
        ref={heroRef}
        onMouseMove={handleHeroMove}
        className="bg-grain relative overflow-hidden bg-[radial-gradient(ellipse_120%_100%_at_50%_-10%,#1a4fd8_0%,#0038AE_55%,#001550_100%)] pt-20 text-crisp-white"
        style={{ ['--mx' as any]: '50%', ['--my' as any]: '10%' }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-70 transition-opacity"
          style={{
            background: 'radial-gradient(480px circle at var(--mx) var(--my), rgba(247,190,41,0.16), transparent 60%)',
          }}
        />
        <Sunburst className="pointer-events-none absolute -left-12 top-8 h-48 w-48 text-white/[0.06] animate-[spin_60s_linear_infinite]" />
        <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.06]" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary/25 blur-3xl animate-float-slower" />
        <div className="pointer-events-none absolute top-24 right-10 h-48 w-48 rounded-full bg-[#b6c4ff]/20 blur-3xl animate-float-slow" />

        <CoastSkyline className="pointer-events-none absolute inset-x-0 bottom-14 h-28 w-full text-white/[0.07] md:bottom-20 md:h-36" />

        <div className="relative z-[2] mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-16 pb-14 md:pt-24 md:pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <Reveal>
              <span className="inline-flex items-center gap-2 border border-accent-gold/40 bg-white/[0.06] px-4 py-2 font-label-caps text-label-caps uppercase tracking-[0.15em] text-accent-gold">
                <span aria-hidden="true">✺</span> El conserje digital de tus apartamentos
              </span>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="mt-7 max-w-xl font-display-lg text-[2.5rem] leading-[1.08] tracking-tight md:text-[3.75rem]">
                La guía que responde por ti
                <br />
                <span className="italic text-accent-gold">mientras tú descansas</span>
              </h1>
            </Reveal>

            <Reveal delay={180}>
              <div className="mt-6 h-px w-16 bg-gradient-to-r from-transparent via-accent-gold to-transparent" />
            </Reveal>

            <Reveal delay={220}>
              <p className="mt-6 max-w-xl font-body-md text-body-md text-white/80 md:text-body-lg">
                WiFi, check-in, normas, restaurantes, playas y experiencias — en el idioma de tu
                huésped, en un QR. Sin apps, sin PDFs.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <a
                  href={CONTACT_MAILTO}
                  className="group inline-flex items-center justify-center gap-2 bg-crisp-white px-7 py-3.5 font-label-caps text-label-caps uppercase text-primary transition-transform hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined text-xl">mail</span>
                  Solicitar demo gratuita
                </a>
                <a
                  href="#como-funciona"
                  className="inline-flex items-center justify-center gap-2 border border-white/30 px-7 py-3.5 font-label-caps text-label-caps uppercase text-crisp-white transition-colors hover:bg-white/10"
                >
                  Cómo funciona
                  <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-y-0.5">arrow_downward</span>
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="hidden justify-center lg:flex">
            <PhoneMockup />
          </Reveal>
        </div>

        <Reveal delay={200} className="relative z-[2] flex justify-center pb-10 lg:hidden">
          <PhoneMockup className="scale-[0.85]" />
        </Reveal>

        <div className="relative z-[2] overflow-hidden border-y border-white/10 bg-black/15 py-3">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-label-caps text-label-caps uppercase tracking-[0.2em] text-white/50">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-10">
                {TICKER_ITEMS.map((label) => (
                  <span key={label} className="flex items-center gap-10">
                    {label}
                    <span className="text-accent-gold">✺</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="horizon-rule" />
      </div>

      {/* ============ TE SUENA ESTO (dolor) ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary">El día a día</span>
          <h2 className="mt-3 font-display-lg text-display-lg text-[1.75rem] text-on-background uppercase tracking-tight md:text-[2.25rem]">
            ¿Te suena esto?
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          {PAIN_POINTS.map((p, i) => (
            <Reveal key={p.text} delay={i * 80}>
              <div className="flex items-start gap-4 border border-on-background/10 bg-surface-container-lowest p-6">
                <span className="material-symbols-outlined text-on-background">{p.icon}</span>
                <p className="font-body-md text-body-md text-on-background">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <p className="mt-8 text-center font-body-md text-body-md text-on-surface-variant">
            Todo eso son minutos tuyos, y algunos puntos de tu reseña.
          </p>
        </Reveal>
      </section>

      {/* ============ ASÍ DE FÁCIL FUNCIONA (pasos) ============ */}
      <section id="como-funciona" className="relative bg-warm-sand py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.04]" />
        <div className="relative mx-auto max-w-4xl px-6">
          <Reveal className="text-center">
            <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-secondary">El proceso</span>
            <h2 className="mt-3 font-display-lg text-display-lg text-[1.75rem] text-on-background uppercase tracking-tight md:text-[2.25rem]">
              Así de fácil funciona
            </h2>
          </Reveal>

          <div className="relative mt-16">
            <div className="absolute bottom-0 left-6 top-0 w-px bg-gradient-to-b from-transparent via-accent-gold to-transparent md:left-1/2 md:-translate-x-1/2" />

            <div className="flex flex-col gap-10 md:gap-4">
              {STEPS.map((s, i) => {
                const isEven = i % 2 === 0;
                return (
                  <Reveal key={s.step} delay={i * 100} className="relative">
                    <div className={`flex items-start gap-6 md:gap-10 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                      <div className={`hidden md:block md:w-1/2 ${isEven ? 'text-right' : 'text-left'}`}>
                        <div className="inline-block border border-on-background/10 bg-surface-container-lowest px-7 py-5">
                          <h4 className="font-headline-md text-headline-md text-on-background">{s.title}</h4>
                          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{s.desc}</p>
                        </div>
                      </div>

                      <div className="relative z-10 flex h-12 w-12 flex-none items-center justify-center rounded-full bg-primary font-mono-badge text-lg text-on-primary md:absolute md:left-1/2 md:-translate-x-1/2">
                        <span>{s.emoji}</span>
                      </div>

                      <div className="flex-1 md:hidden">
                        <div className="border border-on-background/10 bg-surface-container-lowest px-6 py-5">
                          <span className="font-label-caps text-label-caps uppercase text-primary">Paso {s.step}</span>
                          <h4 className="mt-1 font-headline-md text-headline-md text-on-background">{s.title}</h4>
                          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{s.desc}</p>
                        </div>
                      </div>

                      <div className="hidden md:block md:w-1/2" />
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============ DISEÑADO POR Y PARA ANFITRIONES (editorial) ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="flex flex-col items-center gap-10 md:flex-row md:gap-14">
          <Reveal className="w-full md:w-1/3">
            <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary">Cuidado editorial</span>
            <h2 className="mt-3 font-display-lg text-display-lg text-[1.75rem] text-on-background tracking-tight md:text-[2.25rem]">
              Diseñado por y para anfitriones
            </h2>
            <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
              Una experiencia estética que refleja el cuidado de tu alojamiento. Nada de QR
              genéricos: una guía con el mismo nivel de detalle que pones en tu piso.
            </p>
          </Reveal>
          <Reveal delay={120} className="grid w-full grid-cols-2 gap-4 md:w-2/3">
            <div className="arch-mask bg-grain relative h-64 overflow-hidden border border-on-background/10 md:h-96">
              <MediaPlaceholder label="Tu espacio" />
            </div>
            <div className="arch-mask bg-grain relative h-64 overflow-hidden border border-on-background/10 md:mt-12 md:h-96">
              <MediaPlaceholder label="Tu guía" />
            </div>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 90}>
              <div className="flex h-full flex-col gap-3 border border-on-background/10 bg-surface-container-lowest p-7">
                <span className="font-mono-badge text-mono-badge font-bold text-primary">{b.n}</span>
                <h3 className="font-headline-md text-headline-md text-on-background">{b.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ FEATURES (bento) ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary">La experiencia</span>
          <h2 className="mt-3 font-display-lg text-display-lg text-[1.75rem] text-on-background uppercase tracking-tight md:text-[2.25rem]">
            Todo lo que tu huésped necesita, en un QR
          </h2>
          <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
            Sin apps que descargar. Sin papeles que imprimir. Un código QR por apartamento
            que abre una guía completa y personalizada.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6 lg:auto-rows-[13rem]">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70} className={`${f.span} h-full`}>
              <TiltCard className="relative h-full overflow-hidden border border-on-background/10 bg-surface-container-lowest p-7">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.08]"
                  style={{ background: f.accent }}
                />
                <div className={`relative mb-5 inline-flex h-14 w-14 items-center justify-center ${f.tint}`}>
                  <span className={`material-symbols-outlined text-3xl ${f.iconColor}`}>{f.icon}</span>
                </div>
                <h3 className="relative font-headline-md text-headline-md text-on-background">{f.title}</h3>
                <p className="relative mt-2 font-body-md text-body-md text-on-surface-variant">{f.desc}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ 13 IDIOMAS ============ */}
      <section className="relative overflow-hidden bg-deep-sea py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.1]" />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 md:flex-row">
          <Reveal className="flex w-full flex-col items-start gap-4 md:w-1/2">
            <span className="stamped-badge-3 inline-block bg-accent-gold px-4 py-2 font-mono-badge text-mono-badge text-deep-sea">
              AUTOMÁTICO
            </span>
            <h2 className="font-display-lg text-display-lg text-[1.75rem] text-on-primary md:text-[2.25rem]">
              Tu huésped lee su idioma. Tú escribes solo el tuyo.
            </h2>
            <p className="font-body-md text-body-lg text-white/80">
              Escribes el contenido en español y el sistema lo traduce automáticamente a los 13
              idiomas más hablados por los turistas en España — árabe incluido, con lectura de
              derecha a izquierda. Sin copiar y pegar en el traductor.
            </p>
          </Reveal>
          <Reveal delay={150} className="flex w-full justify-center md:w-1/2 md:justify-end">
            <div className="flex max-w-md flex-wrap justify-center gap-4 md:justify-end">
              {LANGUAGES.map((code) => (
                <LangChip key={code} code={code} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ CHATBOT IA ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="flex flex-col items-center gap-12 md:flex-row">
          <Reveal className="w-full md:w-1/2">
            <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary">Soporte 24/7</span>
            <h2 className="mt-3 font-display-lg text-display-lg text-[1.75rem] text-on-background md:text-[2.25rem]">
              Un conserje que no duerme
            </h2>
            <p className="mt-4 font-body-md text-body-lg text-on-surface-variant">
              El asistente responde con la información real de tu alojamiento — la hora del
              check-out, cómo funciona el aire acondicionado, dónde hay una farmacia abierta — a
              cualquier hora y en el idioma de tu huésped. Si no lo sabe, no se lo inventa: te lo
              deriva a ti.
            </p>
          </Reveal>
          <Reveal delay={120} className="flex w-full justify-center md:w-1/2">
            <ChatMockup />
          </Reveal>
        </div>
      </section>

      {/* ============ INGRESOS ============ */}
      <section className="relative bg-warm-sand py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.04]" />
        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <Reveal>
            <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-secondary">Nuevo canal</span>
            <h2 className="mt-3 font-display-lg text-display-lg text-[1.75rem] text-on-background uppercase tracking-tight md:text-[2.25rem]">
              De gasto fijo a activo que genera
            </h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {REVENUE.map((r, i) => (
              <Reveal key={r.badge} delay={i * 90}>
                <div className="flex h-full flex-col items-center justify-center gap-4 border border-on-background/10 bg-crisp-white p-10">
                  <span className={`${r.rotate} inline-block bg-primary px-4 py-2 font-mono-badge text-mono-badge text-on-primary`}>
                    {r.badge}
                  </span>
                  <p className="font-body-md text-body-md text-on-background">{r.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={250}>
            <p className="mt-10 font-body-md text-body-md text-on-surface-variant">
              El guidebook deja de ser una línea de coste y pasa a ser un canal.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ PROOF (zona + stats) ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary">La zona</span>
          <h2 className="mt-3 font-display-lg text-display-lg text-[1.75rem] text-on-background uppercase tracking-tight md:text-[2.25rem]">
            Creado para la Costa del Sol
          </h2>
          <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
            VisualTastes ya trabaja con restaurantes en la zona. Ahora conectamos
            el alojamiento turístico con la gastronomía local.
          </p>
        </Reveal>

        <Reveal delay={120} className="relative mt-12 overflow-hidden border border-on-background/10 bg-deep-sea">
          <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.12]" />
          <div className="relative grid grid-cols-1 gap-8 px-8 py-12 text-center sm:grid-cols-3">
            <div>
              <CountUp to={13} />
              <div className="mt-2 font-label-caps text-label-caps uppercase tracking-wider text-white/75">Idiomas soportados</div>
            </div>
            <div>
              <div className="font-mono-badge text-[2.5rem] leading-none text-accent-gold">0€</div>
              <div className="mt-2 font-label-caps text-label-caps uppercase tracking-wider text-white/75">Coste de entrada</div>
            </div>
            <div>
              <div className="font-mono-badge text-[2.5rem] leading-none text-accent-gold">&lt;2min</div>
              <div className="mt-2 font-label-caps text-label-caps uppercase tracking-wider text-white/75">Setup por piso</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ VISUALTASTE TV ============ */}
      <section className="relative overflow-hidden border-t border-primary/20 bg-deep-sea py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.1]" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <Reveal>
            <span className="stamped-badge-2 inline-block bg-accent-gold px-4 py-2 font-mono-badge text-mono-badge text-deep-sea">
              EMPAREJAR: 6 DÍGITOS
            </span>
            <h2 className="mt-4 font-display-lg text-display-lg text-[1.75rem] text-on-primary md:text-[2.25rem]">
              Y en la tele del salón, también
            </h2>
            <p className="mx-auto mt-4 max-w-xl font-body-md text-body-md text-white/80">
              Enciende la TV del apartamento y aparece la bienvenida: WiFi en pantalla grande, la
              guía y los alrededores. El huésped pasa el resto al móvil escaneando un QR. Funciona
              aunque el WiFi vaya lento al arrancar.
            </p>
          </Reveal>
          <Reveal delay={150} className="mt-10">
            <TvMockup />
          </Reveal>
        </div>
      </section>

      {/* ============ PANEL DE AGENCIA ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="flex flex-col items-center gap-12 md:flex-row">
          <Reveal className="w-full md:w-1/3">
            <h2 className="font-display-lg text-display-lg text-[1.75rem] text-on-background md:text-[2.25rem]">
              Diseñado para quien gestiona 20 pisos, no 1
            </h2>
            <p className="mt-4 font-body-md text-body-lg text-on-surface-variant">
              Centraliza la información compartida de tu zona (los POIs de Fuengirola se escriben
              una vez, no veinte), asigna roles a tu equipo y genera QR con tu marca para cada
              propiedad en un clic.
            </p>
          </Reveal>
          <Reveal delay={120} className="w-full md:w-2/3">
            <DashboardMockup />
          </Reveal>
        </div>
      </section>

      {/* ============ COMPARATIVA ============ */}
      <section className="relative bg-warm-sand py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.04]" />
        <div className="relative mx-auto max-w-4xl px-6">
          <Reveal className="text-center">
            <h2 className="font-display-lg text-display-lg text-[1.75rem] text-on-background uppercase tracking-tight md:text-[2.25rem]">
              La diferencia es clara
            </h2>
          </Reveal>
          <Reveal delay={120} className="mt-12 overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-4 border-l border-t border-on-background/10 bg-crisp-white">
              <div className="flex items-center border-b border-r border-on-background/10 p-4">
                <span className="font-label-caps text-label-caps text-on-surface-variant">Característica</span>
              </div>
              <div className="flex items-center justify-center border-b border-r border-on-background/10 p-4 text-center">
                <span className="font-body-md text-body-md font-semibold text-on-background">PDF / plantilla</span>
              </div>
              <div className="flex items-center justify-center border-b border-r border-on-background/10 p-4 text-center">
                <span className="font-body-md text-body-md font-semibold text-on-background">Otros QR</span>
              </div>
              <div className="flex items-center justify-center border-b border-on-background/10 bg-primary/5 p-4 text-center">
                <span className="font-body-md text-body-md font-semibold text-primary">VisualTastes</span>
              </div>

              {COMPARISON_ROWS.map((row) => (
                <div key={row.label} className="contents">
                  <div className="flex items-center border-b border-r border-on-background/10 p-4 font-body-md text-body-md text-on-background">
                    {row.label}
                  </div>
                  <div className="flex items-center justify-center border-b border-r border-on-background/10 p-4 text-center font-body-md text-body-md text-on-surface-variant">
                    {row.pdf}
                  </div>
                  <div className="flex items-center justify-center border-b border-r border-on-background/10 p-4 text-center font-body-md text-body-md text-on-surface-variant">
                    {row.other}
                  </div>
                  <div className="flex items-center justify-center border-b border-on-background/10 bg-primary/5 p-4 text-accent-gold">
                    <span className="material-symbols-outlined" aria-label="Sí">check_circle</span>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ PRECIO ============ */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <Reveal className="text-center">
          <h2 className="font-display-lg text-display-lg text-[1.75rem] text-on-background uppercase tracking-tight md:text-[2.25rem]">
            Empieza gratis. Paga cuando te aporte.
          </h2>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
          {PRICING_PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 100}>
              <div className="relative flex h-full flex-col gap-3 border border-on-background/10 bg-crisp-white p-8">
                {plan.badge && (
                  <span className="stamped-badge-1 absolute -top-3 right-6 inline-block bg-accent-gold px-3 py-1 font-mono-badge text-mono-badge text-deep-sea">
                    {plan.badge}
                  </span>
                )}
                <h3 className="font-label-caps text-label-caps uppercase text-on-surface-variant">{plan.name}</h3>
                <div className="my-3 font-mono-badge text-[2rem] text-primary">{plan.price}</div>
                <ul className="mb-8 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 font-body-md text-body-md text-on-surface-variant">
                      <span className="material-symbols-outlined text-[18px] text-accent-gold">check</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={CONTACT_MAILTO}
                  className="mt-auto w-full bg-primary px-6 py-4 text-center font-label-caps text-label-caps uppercase text-on-primary transition-opacity hover:opacity-90"
                >
                  {plan.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <p className="mt-8 text-center font-body-md text-body-md text-on-surface-variant">
            Sin tarjeta. Sin permanencia. Montamos tu primer piso contigo.
          </p>
        </Reveal>
      </section>

      {/* ============ FAQ ============ */}
      <section className="relative bg-warm-sand py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.04]" />
        <div className="relative mx-auto max-w-2xl px-6">
          <Reveal className="text-center">
            <h2 className="mb-12 font-display-lg text-display-lg text-[1.75rem] text-on-background uppercase tracking-tight md:text-[2.25rem]">
              Preguntas frecuentes
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <FaqAccordion items={FAQ_ITEMS} />
          </Reveal>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="px-6 pb-20">
        <Reveal className="relative mx-auto max-w-5xl overflow-hidden border border-accent-gold/30 bg-[radial-gradient(ellipse_140%_120%_at_50%_0%,#1a4fd8_0%,#0038AE_60%,#001550_100%)] px-6 py-16 text-center text-crisp-white md:py-20">
          <Sunburst className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 text-white/[0.07]" />
          <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.05]" />
          <span className="relative font-label-caps text-label-caps uppercase tracking-[0.2em] text-white/70">Para agencias y anfitriones</span>
          <h2 className="relative mt-3 font-display-lg text-display-lg text-[1.75rem] uppercase tracking-tight md:text-[2.25rem]">
            Ofrece algo más que unas llaves
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl font-body-md text-body-md text-white/90 md:text-body-lg">
            Dale a tus huéspedes la mejor experiencia digital — gratis para tu agencia.
          </p>
          <a
            href={CONTACT_MAILTO}
            className="relative mt-8 inline-flex items-center justify-center gap-2 bg-crisp-white px-8 py-3.5 font-label-caps text-label-caps uppercase text-primary transition-transform hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-xl">mail</span>
            Solicitar demo gratuita
          </a>
        </Reveal>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="relative bg-deep-sea pb-10 pt-1 text-crisp-white">
        <div className="horizon-rule opacity-70" />
        <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-10 px-6 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <span className="font-display-lg text-headline-md text-on-primary">VisualTastes</span>
            <p className="mt-3 font-body-md text-body-md text-white/70">
              Guidebook digital para apartamentos turísticos. Parte del ecosistema{' '}
              <a href="https://visualtastes.com" target="_blank" rel="noopener" className="text-accent-gold underline-offset-2 hover:underline">
                VisualTastes
              </a>
              .
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <nav className="flex flex-col gap-2">
              <span className="mb-1 font-mono-badge text-mono-badge text-accent-gold">PRODUCTO</span>
              <a href={CONTACT_MAILTO} className="font-label-caps text-label-caps text-white/70 hover:text-accent-gold">DEMO</a>
              <a href="#pricing" className="font-label-caps text-label-caps text-white/70 hover:text-accent-gold">PRECIOS</a>
            </nav>
            <nav className="flex flex-col gap-2">
              <span className="mb-1 font-mono-badge text-mono-badge text-accent-gold">LEGAL</span>
              <Link to="/legal" className="font-label-caps text-label-caps text-white/70 hover:text-accent-gold">PRIVACIDAD Y AVISO LEGAL</Link>
            </nav>
            <nav className="flex flex-col gap-2">
              <span className="mb-1 font-mono-badge text-mono-badge text-accent-gold">SOPORTE</span>
              <a href={CONTACT_MAILTO} className="font-label-caps text-label-caps text-white/70 hover:text-accent-gold">CONTACTO</a>
            </nav>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl px-6">
          <div className="h-px w-full bg-white/10" />
          <p className="mt-6 font-mono-badge text-[10px] text-white/50">
            © {new Date().getFullYear()} VisualTastes. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============ Data — keeps JSX clean ============

const TICKER_ITEMS = [
  'Información del piso',
  'Restaurantes con carta visual',
  'Chatbot IA',
  'Mapa de la zona',
  'Tienda del alojamiento',
  'Pantalla de TV',
  'Analítica',
];

const PAIN_POINTS = [
  { icon: 'wifi', text: '«¿Cuál es la clave del WiFi?» — a las 23:40, otra vez.' },
  { icon: 'restaurant', text: '«¿Dónde comemos bien por aquí?» — y acabas mandando enlaces sueltos.' },
  { icon: 'translate', text: 'Tu huésped no habla español y tu manual solo está en español.' },
  { icon: 'description', text: 'Imprimes un dossier que se mancha, se pierde y queda desactualizado.' },
];

const STEPS = [
  { step: '1', emoji: '📝', title: 'Crea tu agencia', desc: 'Registra tus apartamentos y rellena la info de cada piso una vez.' },
  { step: '2', emoji: '📥', title: 'Importa lo que ya existe', desc: 'Traemos los POIs de la zona desde Google Maps y los datos del piso desde tu anuncio.' },
  { step: '3', emoji: '🖨️', title: 'Imprime el QR', desc: 'Cada piso tiene un QR único. Ponlo en la entrada o envíalo por Airbnb.' },
  { step: '4', emoji: '📱', title: 'El huésped escanea', desc: 'Abre la guía en su móvil, en su idioma. Tú ves qué mira y qué reserva.' },
];

const BENEFITS = [
  { n: '01', title: 'Auto-gestión real', desc: 'Muchas dudas de tus huéspedes se resuelven solas, antes de que te escriban.' },
  { n: '02', title: 'Up-selling sutil', desc: 'Ofrece late check-out, limpieza extra o productos locales directamente desde la guía.' },
  { n: '03', title: 'Siempre actual', desc: 'Cambia la contraseña del WiFi o añade un restaurante y se actualiza al instante en todos los QR.' },
];

const FEATURES = [
  { icon: 'apartment', tint: 'bg-primary/12', iconColor: 'text-primary', accent: '#0038AE', span: 'lg:col-span-4 lg:row-span-2', title: 'Información del apartamento', desc: 'WiFi, check-in/out, normas, parking, electrodomésticos, basura, emergencias. Escrito una vez, traducido solo.' },
  { icon: 'restaurant', tint: 'bg-secondary/10', iconColor: 'text-secondary', accent: '#48607E', span: 'lg:col-span-2', title: 'Restaurantes con carta visual', desc: 'La carta en vídeo del ecosistema VisualTastes, con fotos reales y alérgenos.' },
  { icon: 'shopping_bag', tint: 'bg-primary/12', iconColor: 'text-primary', accent: '#0038AE', span: 'lg:col-span-2', title: 'Tienda del alojamiento', desc: 'Vende late check-out, cesta de bienvenida o toallas de playa con pedido registrado.' },
  { icon: 'sailing', tint: 'bg-secondary/10', iconColor: 'text-secondary', accent: '#48607E', span: 'lg:col-span-3', title: 'Experiencias locales', desc: 'Barco, motos de agua, surf, tours... reserva por WhatsApp o web.' },
  { icon: 'explore', tint: 'bg-primary/12', iconColor: 'text-primary', accent: '#0038AE', span: 'lg:col-span-3', title: 'Mapa de la zona con POIs reales', desc: 'Playas, farmacias, supermercados y monumentos con foto y ruta a Google Maps.' },
  { icon: 'bar_chart', tint: 'bg-secondary/10', iconColor: 'text-secondary', accent: '#48607E', span: 'lg:col-span-6', title: 'Analítica para tu agencia', desc: 'Cuántos huéspedes escanean el QR, cuánto tiempo pasan y qué restaurantes les interesan más.' },
];

const LANGUAGES = ['ES', 'EN', 'FR', 'DE', 'IT', 'PT', 'CA', 'AR', 'RU', 'UK', 'ZH', 'JA', 'KO'];

const REVENUE = [
  { badge: 'TIENDA DEL ALOJAMIENTO', rotate: 'stamped-badge-1', desc: 'Vende servicios y extras directamente desde la guía.' },
  { badge: 'EXPERIENCIAS', rotate: 'stamped-badge-2', desc: 'Cada reserva sale de tu guía; sabes cuál funciona mejor.' },
  { badge: 'RESTAURANTES PARTNER', rotate: 'stamped-badge-3', desc: 'Medimos el embudo completo: clic en la guía → visita real.' },
];

const COMPARISON_ROWS = [
  { label: 'Actualizar el WiFi', pdf: 'Reimprimir', other: 'Manual' },
  { label: 'Idiomas', pdf: '1–2', other: 'Traductor del móvil' },
  { label: 'Mapa con POIs reales', pdf: '—', other: 'Básico' },
  { label: 'Chatbot IA', pdf: '—', other: '—' },
  { label: 'Vender extras', pdf: '—', other: 'Limitado' },
  { label: 'Cartas de restaurante en vídeo', pdf: '—', other: '—' },
  { label: 'Pantalla de TV', pdf: '—', other: '—' },
  { label: 'Analítica de uso', pdf: '—', other: 'Básica' },
];

const PRICING_PLANS = [
  {
    name: 'Guidebook',
    price: '0€',
    badge: 'GRATIS',
    features: ['Información del piso', 'POIs y mapas', 'Experiencias locales', '13 idiomas'],
    cta: 'Empezar ya',
  },
  {
    name: 'Plan Agencia',
    price: 'Consultar',
    badge: null as string | null,
    features: ['Tienda del alojamiento', 'Integración TV', 'Analítica avanzada', 'Marca propia'],
    cta: 'Contactar',
  },
];

const FAQ_ITEMS = [
  {
    q: '¿Mis huéspedes tienen que descargar una app?',
    a: 'No. La guía se abre directamente en el navegador del móvil; si quieren, pueden instalarla como app desde ahí, sin pasar por ninguna tienda de aplicaciones.',
  },
  {
    q: '¿Cuánto tiempo se tarda en montar la guía?',
    a: 'Unos minutos: importamos los puntos de interés de la zona desde Google Maps y los datos básicos del piso desde tu anuncio. Tú solo revisas y ajustas.',
  },
  {
    q: '¿Cómo funciona la traducción automática?',
    a: 'Escribes el contenido una vez en español y el sistema lo traduce a los 13 idiomas activos. Si luego cambias algo, se retraduce solo, sin que tengas que tocar los otros 12 idiomas.',
  },
  {
    q: '¿Puedo usar mi propia marca y logo?',
    a: 'Sí, la guía se personaliza con el logo y el color de acento de tu agencia.',
  },
  {
    q: '¿Cómo cambio la clave del WiFi en todas las guías?',
    a: 'La cambias una vez en el panel de tu apartamento y se actualiza al momento en los 13 idiomas y en la pantalla de TV, sin reimprimir nada.',
  },
  {
    q: '¿Sirve para cualquier tipo de alojamiento?',
    a: 'Sí: apartamentos, villas, habitaciones o alojamiento rural — cualquier estancia de corta duración con un anfitrión detrás.',
  },
  {
    q: '¿Qué pasa con los datos de mis huéspedes?',
    a: 'Recogemos métricas de uso anónimas (qué secciones visitan, cuánto tiempo) para ayudarte a mejorar la guía. No perfilamos a tus huéspedes como personas.',
  },
];
