// src/pages/LandingPage.tsx — Sales landing: Modern Mediterranean Editorial, mobile-first
//
// Sin pantalla de Stitch para esta página (el export solo cubre las 5 pantallas
// del huésped) — el sistema visual (cobalto, Newsreader/Inter/Archivo Narrow/
// Space Mono, arcos, horizon rules, azulejo, stamped badges, sin sombras/
// esquinas redondeadas) se extrapola aquí manteniendo las mismas secciones y
// el mismo copy que la versión "Mediterranean Horizon" anterior.
import { useEffect, useRef, useState, type ReactNode } from 'react';

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

// ---------- coastal village silhouette ----------
function CoastSkyline({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <g fill="currentColor">
        <rect x="40" y="90" width="90" height="110" />
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
        <span aria-hidden="true">⭐</span> 4.9 · huéspedes felices
      </span>
      <span className="absolute -right-6 bottom-24 z-10 flex animate-float-slower items-center gap-1.5 border border-on-background/10 bg-crisp-white/95 px-3.5 py-2 font-label-sm text-label-sm text-primary">
        🇪🇸🇬🇧🇫🇷 +14 idiomas
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
            {['🇪🇸', '🇬🇧', '🇫🇷', '🇩🇪'].map((f) => (
              <span key={f} className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-variant text-xs">
                {f}
              </span>
            ))}
            <span className="flex h-6 items-center rounded-full bg-primary/10 px-2 text-[10px] font-label-sm text-primary">+10</span>
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

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement | null>(null);

  const handleHeroMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface overflow-x-hidden">
      {/* ============ HERO ============ */}
      <div
        ref={heroRef}
        onMouseMove={handleHeroMove}
        className="bg-grain relative overflow-hidden bg-[radial-gradient(ellipse_120%_100%_at_50%_-10%,#1a4fd8_0%,#0038AE_55%,#001550_100%)] text-crisp-white"
        style={{ ['--mx' as any]: '50%', ['--my' as any]: '10%' }}
      >
        {/* cursor spotlight */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-70 transition-opacity"
          style={{
            background: 'radial-gradient(480px circle at var(--mx) var(--my), rgba(247,190,41,0.16), transparent 60%)',
          }}
        />
        {/* decorative sunburst + azulejo */}
        <Sunburst className="pointer-events-none absolute -left-12 top-8 h-48 w-48 text-white/[0.06] animate-[spin_60s_linear_infinite]" />
        <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.06]" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary/25 blur-3xl animate-float-slower" />
        <div className="pointer-events-none absolute top-24 right-10 h-48 w-48 rounded-full bg-[#b6c4ff]/20 blur-3xl animate-float-slow" />

        {/* coastal village silhouette peeking above the wave */}
        <CoastSkyline className="pointer-events-none absolute inset-x-0 bottom-14 h-28 w-full text-white/[0.07] md:bottom-20 md:h-36" />

        <div className="relative z-[2] mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-16 pb-14 md:pt-24 md:pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <Reveal>
              <span className="inline-flex items-center gap-2 border border-accent-gold/40 bg-white/[0.06] px-4 py-2 font-label-caps text-label-caps uppercase tracking-[0.15em] text-accent-gold">
                <span aria-hidden="true">✺</span> Nuevo producto VisualTastes
              </span>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="mt-7 max-w-xl font-display-lg text-[2.5rem] leading-[1.08] tracking-tight md:text-[3.75rem]">
                El guidebook digital
                <br />
                <span className="italic text-accent-gold">para tus apartamentos</span>
              </h1>
            </Reveal>

            <Reveal delay={180}>
              <div className="mt-6 h-px w-16 bg-gradient-to-r from-transparent via-accent-gold to-transparent" />
            </Reveal>

            <Reveal delay={220}>
              <p className="mt-6 max-w-xl font-body-md text-body-md md:text-body-lg text-white/80">
                Transforma la experiencia de tus huéspedes con una guía interactiva.
                Restaurantes, experiencias y toda la info del piso — en 14 idiomas.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <a
                  href="mailto:info@visualtastes.com"
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

        {/* marquee ticker */}
        <div className="relative z-[2] overflow-hidden border-y border-white/10 bg-black/15 py-3">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-label-caps text-label-caps uppercase tracking-[0.2em] text-white/50">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-10">
                <span>Restaurantes con carta visual</span>
                <span className="text-accent-gold">✺</span>
                <span>Experiencias locales</span>
                <span className="text-accent-gold">✺</span>
                <span>14 idiomas automáticos</span>
                <span className="text-accent-gold">✺</span>
                <span>Analíticas para tu agencia</span>
                <span className="text-accent-gold">✺</span>
              </div>
            ))}
          </div>
        </div>

        {/* horizon rule — cierre del hero en vez de la ola anterior */}
        <div className="horizon-rule" />
      </div>

      {/* ============ FEATURES (bento) ============ */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary">La experiencia</span>
          <h2 className="mt-3 font-display-lg text-display-lg text-[1.75rem] md:text-[2.25rem] text-on-background uppercase tracking-tight">
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

      {/* ============ STEPS (timeline) ============ */}
      <section className="relative bg-surface-container-low py-16 md:py-24">
        <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.04]" />
        <div className="relative mx-auto max-w-4xl px-6">
          <Reveal className="text-center">
            <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-secondary">El proceso</span>
            <h2 className="mt-3 font-display-lg text-display-lg text-[1.75rem] md:text-[2.25rem] text-on-background uppercase tracking-tight">
              Así de fácil funciona
            </h2>
          </Reveal>

          <div className="relative mt-16">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent-gold to-transparent md:left-1/2 md:-translate-x-1/2" />

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

      {/* ============ PROOF ============ */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary">La zona</span>
          <h2 className="mt-3 font-display-lg text-display-lg text-[1.75rem] md:text-[2.25rem] text-on-background uppercase tracking-tight">
            Creado para la Costa del Sol
          </h2>
          <p className="mt-4 font-body-md text-body-md text-on-surface-variant">
            VisualTastes ya trabaja con restaurantes en la zona. Ahora conectamos
            el alojamiento turístico con la gastronomía local.
          </p>
        </Reveal>

        <Reveal delay={120} className="relative mt-12 overflow-hidden border border-on-background/10 bg-[#001550]">
          <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.12]" />
          <div className="relative grid grid-cols-1 gap-8 px-8 py-12 text-center sm:grid-cols-3">
            <div>
              <CountUp to={14} />
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

        <Reveal delay={200} className="mx-auto mt-10 max-w-3xl border border-secondary/25 bg-secondary-container/40 p-7 text-center">
          <p className="font-headline-md text-headline-md text-secondary">🎁 Guidebook gratuito para tu agencia</p>
          <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
            El Guidebook es gratis e incluye información del piso, POIs y experiencias.
            Los restaurantes aparecen gracias a su suscripción en VisualTastes.
          </p>
        </Reveal>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="px-6 pb-20">
        <Reveal className="relative mx-auto max-w-5xl overflow-hidden border border-accent-gold/30 bg-[radial-gradient(ellipse_140%_120%_at_50%_0%,#1a4fd8_0%,#0038AE_60%,#001550_100%)] px-6 py-16 text-center text-crisp-white md:py-20">
          <Sunburst className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 text-white/[0.07]" />
          <div className="pointer-events-none absolute inset-0 azulejo-pattern opacity-[0.05]" />
          <span className="relative font-label-caps text-label-caps uppercase tracking-[0.2em] text-white/70">Para agencias y anfitriones</span>
          <h2 className="relative mt-3 font-display-lg text-display-lg text-[1.75rem] md:text-[2.25rem] uppercase tracking-tight">
            ¿Tienes apartamentos turísticos?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl font-body-md text-body-md md:text-body-lg text-white/90">
            Ofrece algo más que unas llaves. Dale a tus huéspedes la mejor experiencia
            digital — gratis para tu agencia.
          </p>
          <a
            href="mailto:info@visualtastes.com"
            className="relative mt-8 inline-flex items-center justify-center gap-2 bg-crisp-white px-8 py-3.5 font-label-caps text-label-caps uppercase text-primary transition-transform hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-xl">mail</span>
            Contactar ahora
          </a>
        </Reveal>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="relative bg-[#001550] pt-1 pb-10 text-center text-crisp-white">
        <div className="horizon-rule opacity-70" />
        <p className="mt-8 font-body-md text-body-md">
          <strong className="text-white/90">VisualTastes Guidebook</strong> — Parte del ecosistema{' '}
          <a href="https://visualtastes.com" target="_blank" rel="noopener" className="text-accent-gold underline-offset-2 hover:underline">
            VisualTastes
          </a>
        </p>
        <p className="mt-1 font-label-sm text-label-sm text-white/50">
          © {new Date().getFullYear()} VisualTastes. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}

// Data — keeps JSX clean
const FEATURES = [
  { icon: 'apartment', tint: 'bg-primary/12', iconColor: 'text-primary', accent: '#0038AE', span: 'lg:col-span-4 lg:row-span-2', title: 'Información del apartamento', desc: 'WiFi, normas, check-in/out, parking, electrodomésticos... Todo traducido automáticamente al idioma del huésped.' },
  { icon: 'restaurant', tint: 'bg-secondary/10', iconColor: 'text-secondary', accent: '#48607E', span: 'lg:col-span-2', title: 'Restaurantes con carta visual', desc: 'Conectado al ecosistema VisualTastes, con fotos reales.' },
  { icon: 'translate', tint: 'bg-primary/12', iconColor: 'text-primary', accent: '#0038AE', span: 'lg:col-span-2', title: '14 idiomas automáticos', desc: 'Detecta el idioma del navegador del huésped.' },
  { icon: 'sailing', tint: 'bg-secondary/10', iconColor: 'text-secondary', accent: '#48607E', span: 'lg:col-span-3', title: 'Experiencias locales', desc: 'Barco, motos de agua, surf, tours... reserva por WhatsApp o web.' },
  { icon: 'explore', tint: 'bg-primary/12', iconColor: 'text-primary', accent: '#0038AE', span: 'lg:col-span-3', title: 'Puntos de interés', desc: 'Playas, miradores y monumentos con enlace directo a Google Maps.' },
  { icon: 'bar_chart', tint: 'bg-secondary/10', iconColor: 'text-secondary', accent: '#48607E', span: 'lg:col-span-6', title: 'Analíticas para tu agencia', desc: 'Cuántos huéspedes escanean el QR, cuánto tiempo pasan y qué restaurantes les interesan más.' },
];

const STEPS = [
  { step: '1', emoji: '📝', title: 'Crea tu agencia', desc: 'Registra tus apartamentos y añade la información de cada piso.' },
  { step: '2', emoji: '🖨️', title: 'Imprime el QR', desc: 'Cada piso tiene un QR único. Ponlo en la entrada o envíalo por Airbnb.' },
  { step: '3', emoji: '📱', title: 'El huésped escanea', desc: 'Abre la guía en su móvil, en su idioma. Sin apps ni descargas.' },
  { step: '4', emoji: '📊', title: 'Tú ves los datos', desc: 'Qué les interesa, cuánto tiempo pasan. Métricas reales para tu negocio.' },
];
