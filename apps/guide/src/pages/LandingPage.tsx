// src/pages/LandingPage.tsx — landing comercial de guide.visualtastes.com (ruta /)
//
// Rediseño de sep-2026: mismo lenguaje que tv.visualtastes.com (apps/tv-landing) — Playfair Display y
// Montserrat autoalojadas, terracota, arcos con contorno, olas y azulejo, sin iconos — pero vendiendo la guía
// del móvil. Sustituye a la landing anterior (cobalto, Newsreader e iconos Material), que salió de un export
// de Stitch en ago 2026.
//
// El diseño de partida vive en un Design artifact («guide.visualtastes.com — rediseño»). Aquí está portado a
// React con su CSS propio (landing/landing.css, todo colgando de .lp) para no depender de Tailwind ni tocar
// el resto de la app.
//
// Reglas que conviene no romper:
//  - Sin precios, cifras ni testimonios inventados: el modelo de precios no está decidido y la página es
//    pública. El marcador de testimonio del diseño NO se ha portado.
//  - Solo se afirma lo que la guía hace hoy en producción. En Restaurantes, p. ej., no se promete «Reservar»
//    hasta que salga.
//  - El móvil del héroe enseña la guía con el diseño nuevo, que la app del huésped aún no tiene: es una vista
//    previa y lleva su nota de «datos ficticios».
//  - Las tipografías de la landing vienen de @fontsource-variable (mismo origen, familias «… Variable»). Ojo: el
//    index.html compartido con la guía del huésped sigue pidiendo Google Fonts en cualquier ruta, esta incluida.
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import '@fontsource-variable/montserrat/index.css';
import '@fontsource-variable/playfair-display/index.css';
import '@fontsource-variable/playfair-display/wght-italic.css';
import './landing/landing.css';
import PhoneDemo from './landing/PhoneDemo';
import { DASH_BARS, DASH_ROWS, FAQ, LANGS, MAILTO, NAV_LINKS, QUESTIONS, STEPS } from './landing/data';
import { IMG } from './landing/images';

const PAGE_TITLE = 'VisualTaste Guía — La guía digital de tu alojamiento, en un QR';
const PAGE_DESCRIPTION =
  'Guía digital con QR para alojamientos del Mediterráneo: WiFi, normas, mapa, restaurantes y un conserje con IA en 13 idiomas. Sin instalar nada.';

// ---------- las cinco pestañas: un arco con un trozo de la interfaz encima ----------

interface TabCardData {
  title: string;
  text: string;
  img: string;
  alt: string;
  pos: string;
  snippet: ReactNode;
}

const TAB_CARDS: TabCardData[] = [
  {
    title: 'Casa',
    text: 'WiFi, código de entrada, hora de salida y las normas, desde el primer segundo.',
    img: IMG.stay,
    alt: 'Una ventana con vistas al mar, un libro de la casa y una llave sobre la mesa',
    pos: '30% 50%',
    snippet: (
      <div className="snip snip-wifi" aria-hidden="true">
        <span className="s-t">WiFi</span>
        <span className="s-m">
          Red <b>CasaAzahar_5G</b>
        </span>
        <span className="s-m">
          Contraseña <b>SolyMar2026</b>
        </span>
        <span className="s-pill">Copiar</span>
      </div>
    ),
  },
  {
    title: 'Lugares',
    text: 'Un mapa con lo mejor de la zona y lo que se tarda en llegar desde el alojamiento.',
    img: IMG.do,
    alt: 'Una cala de aguas turquesa al atardecer con dos tumbonas en la arena',
    pos: '68% 50%',
    snippet: (
      <div className="snip" aria-hidden="true">
        <span className="s-t">Cala Honda</span>
        <span className="s-m">Playa · a 12 min a pie de tu alojamiento</span>
      </div>
    ),
  },
  {
    title: 'Comer',
    text: 'Tus restaurantes de confianza, a un toque.',
    img: IMG.eat,
    alt: 'Un plato de gambas con limón, un arco de piedra y el mar al fondo',
    pos: '54% 50%',
    snippet: (
      <div className="snip" aria-hidden="true">
        <span className="s-t">La Mar Salada</span>
        <span className="s-m">Cocina andaluza</span>
        <span className="s-l">Ver la carta</span>
      </div>
    ),
  },
  {
    title: 'Tienda',
    text: 'Los productos y experiencias que ofreces. El pedido te llega por WhatsApp.',
    img: IMG.store,
    alt: 'Aceite de oliva y aceitunas sobre una mesa de madera, en una terraza con vistas al mar',
    pos: '62% 50%',
    snippet: (
      <div className="snip snip-shop" aria-hidden="true">
        <span className="s-t">Aceite de oliva virgen</span>
        <div className="s-row">
          <span className="s-price">14 €</span>
          <span className="s-pill">Añadir</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Conserje',
    text: 'Responde a cualquier hora con lo que has cargado. Si no lo sabe, lo dice.',
    img: IMG.info,
    alt: 'Una consola de entrada con un libro de normas y una tableta',
    pos: '46% 50%',
    snippet: (
      <div className="snip snip-chat" aria-hidden="true">
        <span className="b u">¿Hay aparcamiento?</span>
        <span className="b a">Sí: tienes una plaza en el garaje, la 14.</span>
      </div>
    ),
  },
];

function TabCard({ card }: { card: TabCardData }) {
  return (
    <article className="tab-card">
      <div className="tab-fig">
        <div className="tab-arch">
          <img loading="lazy" decoding="async" src={card.img} alt={card.alt} style={{ objectPosition: card.pos }} />
        </div>
        {card.snippet}
      </div>
      <h3 className="h3">{card.title}</h3>
      <p>{card.text}</p>
    </article>
  );
}

// ---------- azulejo del pie ----------

function Azulejo() {
  return (
    <svg className="azulejo" width="100%" height="56" aria-hidden="true">
      <defs>
        <pattern id="azl" width="56" height="56" patternUnits="userSpaceOnUse">
          <rect width="56" height="56" fill="#F8F3E9" />
          <rect x="1" y="1" width="54" height="54" fill="none" stroke="#128099" strokeWidth="1.2" />
          <path d="M28 6 C31 17 39 25 50 28 C39 31 31 39 28 50 C25 39 17 31 6 28 C17 25 25 17 28 6 Z" fill="#128099" />
          <circle cx="28" cy="28" r="5" fill="#F0B04B" />
          <circle cx="0" cy="0" r="7" fill="#B04E2B" />
          <circle cx="56" cy="0" r="7" fill="#B04E2B" />
          <circle cx="0" cy="56" r="7" fill="#B04E2B" />
          <circle cx="56" cy="56" r="7" fill="#B04E2B" />
        </pattern>
      </defs>
      <rect width="100%" height="56" fill="url(#azl)" />
    </svg>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langIndex, setLangIndex] = useState(0);
  const greeting = LANGS[langIndex];

  // SEO: esta es una SPA con un único index.html compartido por la landing, /legal y /:slug (la guía real de
  // cada huésped). No hay que pisar el <title> ni la meta description del resto de rutas: se captura el valor
  // original antes de sobrescribirlo y se restaura al desmontar.
  useEffect(() => {
    const prevTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const prevDescription = metaDescription?.getAttribute('content') ?? null;

    document.title = PAGE_TITLE;
    metaDescription?.setAttribute('content', PAGE_DESCRIPTION);

    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.id = 'landing-schema';
    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          name: 'VisualTaste Guía',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          description:
            'Guía digital para alojamientos turísticos: información del alojamiento, mapa de la zona, restaurantes, tienda, conserje con IA y traducción a 13 idiomas.',
          url: 'https://guide.visualtastes.com/',
        },
        {
          '@type': 'FAQPage',
          mainEntity: FAQ.map((item) => ({
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

  // El menú del móvil se cierra con Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="lp">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>

      <header className="nav">
        <div className="nav-in">
          <a className="mark" href="#inicio" aria-label="VisualTaste Guía, ir al inicio">
            VisualTaste <small>Guía</small>
          </a>
          <nav className="nav-links" aria-label="Principal">
            {NAV_LINKS.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="nav-cta">
            <a className="btn btn-p btn-sm" href="#demo">
              Pedir una demo
            </a>
            <button
              className="menu-btn"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="menu-panel"
              onClick={() => setMenuOpen((open) => !open)}
            >
              Menú
            </button>
          </div>
        </div>
        <div className={`menu-panel${menuOpen ? '' : ' off'}`} id="menu-panel">
          {NAV_LINKS.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <a className="btn btn-p" href="#demo" onClick={() => setMenuOpen(false)}>
            Pedir una demo
          </a>
        </div>
      </header>

      <main id="contenido">
        {/* ============ PORTADA ============ */}
        <section className="hero" id="inicio" aria-labelledby="t-hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="label">Guía digital · alojamientos del Mediterráneo</p>
              <h1 className="h1" id="t-hero">
                La guía de tu alojamiento cabe en un <em>QR.</em>
              </h1>
              <p className="lead">
                VisualTaste Guía pone en el móvil de tu huésped el WiFi, las normas, lo mejor de la zona y un conserje que
                responde a cualquier hora, en su idioma y sin instalar nada.
              </p>
              <div className="cta-row">
                <a className="btn btn-p" href="#demo">
                  Pedir una demo
                </a>
                <a className="link" href="#como-funciona">
                  Ver cómo funciona
                </a>
              </div>
              <ul className="facts">
                <li>
                  <b>13</b>
                  <span>idiomas, árabe incluido</span>
                </li>
                <li>
                  <b>0</b>
                  <span>apps que instalar</span>
                </li>
                <li>
                  <b>1</b>
                  <span>QR por alojamiento</span>
                </li>
              </ul>
            </div>
            <PhoneDemo />
          </div>
          <svg className="wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 46 C 160 8 320 8 480 40 S 800 84 960 48 S 1280 6 1440 40 V80 H0 Z" fill="#EEDFC5" />
          </svg>
        </section>

        {/* ============ ANTES DE QUE PREGUNTEN ============ */}
        <section className="sec qa-band" aria-labelledby="t-qa">
          <div className="wrap qa">
            <div className="qa-intro">
              <p className="label">Antes de que pregunten</p>
              <h2 className="h2" id="t-qa">
                Tus huéspedes hacen siempre las mismas <em>cuatro preguntas.</em>
              </h2>
              <p className="lead">La guía las responde antes de que te escriban a las once de la noche.</p>
            </div>
            <div>
              <ol className="qa-list">
                {QUESTIONS.map((row) => (
                  <li className="qa-row" key={row.n}>
                    <span className="qa-n">{row.n}</span>
                    <p className="qa-q">{row.q}</p>
                    <p className="qa-a">
                      <b>En la guía</b>
                      <span>{row.a}</span>
                    </p>
                  </li>
                ))}
              </ol>
              <p className="qa-foot">Lo que no esté a la vista, se lo pregunta al conserje.</p>
            </div>
          </div>
        </section>

        {/* ============ LA GUÍA ============ */}
        <section className="sec" id="guia" aria-labelledby="t-gui">
          <div className="wrap">
            <div className="sec-head c">
              <p className="label">La guía</p>
              <h2 className="h2" id="t-gui">
                Cinco pestañas, ninguna <em>app.</em>
              </h2>
              <p className="lead" style={{ marginTop: 22 }}>
                Lo que tu huésped busca, a un toque: lo de la casa, la zona, dónde comer, la tienda y un conserje para todo lo
                demás.
              </p>
            </div>
            <div className="tabs5">
              {TAB_CARDS.map((card) => (
                <TabCard key={card.title} card={card} />
              ))}
            </div>
          </div>
        </section>

        {/* ============ CÓMO FUNCIONA ============ */}
        <section className="sec steps-band" id="como-funciona" aria-labelledby="t-how">
          <div className="wrap">
            <div className="sec-head">
              <p className="label">Cómo funciona</p>
              <h2 className="h2" id="t-how">
                Tres pasos y la guía ya <em>responde.</em>
              </h2>
            </div>
            <ol className="steps">
              {STEPS.map((step, i) => (
                <li className="step" key={step.title}>
                  <span className="step-n">{i + 1}</span>
                  <h3 className="h3">{step.title}</h3>
                  <p>{step.text}</p>
                  {i === STEPS.length - 1 && (
                    <p className="code-chip">
                      <span>Dirección · ejemplo</span>
                      <b>
                        guide.visualtastes.com
                        <wbr />
                        /casa-azahar
                      </b>
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ============ FRANJA DE FOTO ============ */}
        <section className="band" aria-labelledby="t-band">
          <div>
            <h2 className="h2" id="t-band" style={{ marginTop: 0 }}>
              Tus huéspedes eligieron el Mediterráneo. Que la guía que abran también <em>lo sea.</em>
            </h2>
            <div className="cta-row">
              <a className="btn btn-c" href="#demo">
                Pedir una demo
              </a>
            </div>
          </div>
        </section>

        {/* ============ IDIOMAS ============ */}
        <section className="sec lang" id="idiomas" aria-labelledby="t-lang">
          <svg className="wave-top" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0 H1440 V38 C 1280 74 1120 74 960 38 S 640 2 480 38 S 160 74 0 38 Z" fill="#F8F3E9" />
          </svg>
          <div className="wrap lang-grid">
            <div>
              <p className="label">13 idiomas</p>
              <h2 className="h2" id="t-lang">
                Tú escribes en español. Tu huésped lo lee en <em>el suyo.</em>
              </h2>
              <p className="lead">
                Escribes la guía una vez y se traduce a los 13 idiomas. El huésped elige el suyo desde la propia guía y todo
                cambia con él: las normas, tus recomendaciones y las respuestas del conserje.
              </p>
              <ul className="chips">
                {LANGS.map((l, i) => (
                  <li key={l.code}>
                    <button
                      type="button"
                      className={`chip${i === langIndex ? ' on' : ''}`}
                      lang={l.code}
                      aria-pressed={i === langIndex}
                      onClick={() => setLangIndex(i)}
                    >
                      {l.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="greet" dir={greeting.dir} lang={greeting.code}>
                {greeting.greeting}
              </p>
              <p className="greet-name">{greeting.name}</p>
              <p className="fine">El árabe se lee de derecha a izquierda, y la guía lo respeta.</p>
            </div>
          </div>
        </section>

        {/* ============ MEDIR ============ */}
        <section className="sec" aria-labelledby="t-med">
          <div className="wrap measure-grid">
            <div className="measure-copy">
              <p className="label">Lo que mira tu huésped</p>
              <h2 className="h2" id="t-med">
                Mide la guía, no a tus <em>huéspedes.</em>
              </h2>
              <p className="lead">
                El panel te dice cuántos huéspedes abren la guía, qué secciones miran y qué recomendaciones despiertan
                interés. La medición es anónima: sin cuentas ni perfiles de huéspedes.
              </p>
            </div>
            <figure className="dash" aria-label="Ilustración del panel de estadísticas de la guía">
              <figcaption className="dash-h">
                <span className="dash-t">Guía · Casa Azahar</span>
                <span className="dash-s">Últimos 7 días</span>
              </figcaption>
              <div className="dash-chart" aria-hidden="true">
                {DASH_BARS.map((h, i) => (
                  <i key={i} className={i === 5 ? 'hi' : undefined} style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="dash-days" aria-hidden="true">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <ul className="dash-rows">
                {DASH_ROWS.map((row) => (
                  <li key={row.label}>
                    <span>{row.label}</span>
                    <span className="trk">
                      <i style={{ width: `${row.pct}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="fine">Ilustración del panel. Las cifras reales aparecen en tu panel al empezar a medir.</p>
            </figure>
          </div>
        </section>

        {/* ============ VISUALTASTE TV ============ */}
        <section className="sec tvx-band" aria-labelledby="t-tv">
          <div className="wrap tvx">
            <div className="tvx-copy">
              <p className="label">VisualTaste TV</p>
              <h2 className="h2" id="t-tv">
                Y en la tele del salón, <em>también.</em>
              </h2>
              <p className="lead">
                Si tu alojamiento tiene televisor, VisualTaste TV le da la bienvenida con el WiFi, la guía y los alrededores.
                Lo que cambias en el panel se refleja en el móvil y en la pantalla.
              </p>
              <div className="cta-row">
                <a className="link" href="https://tv.visualtastes.com">
                  Conocer VisualTaste TV
                </a>
              </div>
            </div>
            <div className="tvx-arch">
              <img
                loading="lazy"
                decoding="async"
                src={IMG.info}
                alt="Una tableta de bienvenida sobre una consola de entrada, junto a un libro de la casa"
              />
            </div>
          </div>
        </section>

        {/* ============ PREGUNTAS ============ */}
        <section className="sec faq-band" id="preguntas" aria-labelledby="t-faq">
          <div className="wrap">
            <div className="sec-head">
              <p className="label">Preguntas</p>
              <h2 className="h2" id="t-faq">
                Lo que suele preguntar quien gestiona <em>alojamientos.</em>
              </h2>
            </div>
            <div className="faq-grid">
              {FAQ.map((item) => (
                <div className="faq-item" key={item.q}>
                  <h3 className="faq-q">{item.q}</h3>
                  <p className="faq-a">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ CIERRE ============ */}
        <section className="sec cta" id="demo" aria-labelledby="t-cta">
          <div className="wrap cta-grid">
            <div>
              <p className="label">Pedir una demo</p>
              <h2 className="h2" id="t-cta">
                Que tu huésped lo encuentre todo antes de <em>escribirte.</em>
              </h2>
              <p className="lead">
                Cuéntanos cuántos alojamientos gestionas y te enseñamos cómo se vería la guía en el tuyo, con tu marca.
              </p>
              <div className="cta-row">
                <a className="btn btn-c" href={MAILTO}>
                  Pedir una demo
                </a>
              </div>
            </div>
            <div className="cta-arch">
              <img
                loading="lazy"
                decoding="async"
                src={IMG.stay}
                alt="Un libro de bienvenida sobre una mesa de madera, junto a una ventana luminosa"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <Azulejo />
        <div className="wrap foot-in">
          <div>
            <p className="foot-mark">
              VisualTaste <small>Guía</small>
            </p>
            <p className="foot-p">
              La guía digital del alojamiento de VisualTaste, la plataforma de carta digital y guía para restaurantes y
              alojamientos.
            </p>
            <nav className="foot-nav" aria-label="Legal y contacto">
              <Link to="/legal">Privacidad y aviso legal</Link>
              <a href="https://tv.visualtastes.com">VisualTaste TV</a>
              <a href={MAILTO}>Contacto</a>
            </nav>
          </div>
          <p className="foot-c">
            © {new Date().getFullYear()} VisualTaste · <a href="#inicio">Volver arriba</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
