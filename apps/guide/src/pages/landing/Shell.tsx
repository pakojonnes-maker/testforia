// Piezas comunes de la landing y de sus páginas de venta: cabecera, contacto, pie y preguntas plegables.
//
// La landing es una SPA con un único index.html compartido con la guía del huésped (/:slug), así que cada página
// pone su <title>, su descripción y su canonical al montarse y los devuelve a como estaban al desmontarse. Lo que
// leen los rastreadores sin JavaScript (HTML y JSON-LD de cada página) lo pone el build: scripts/prerender-landing.mjs.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '@fontsource-variable/montserrat/index.css';
import '@fontsource-variable/playfair-display/index.css';
import '@fontsource-variable/playfair-display/wght-italic.css';
import './landing.css';
import { EMAIL, PAGES, PHONE_DISPLAY, PHONE_TEL, SITE, WHATSAPP_NUMBER, type PageMeta, type QA } from './data';
import { IMG } from './images';

// ---------- meta de cada página ----------

function setMeta(selector: string, attr: string, value: string): string | null {
  const el = document.querySelector(selector);
  const prev = el?.getAttribute(attr) ?? null;
  el?.setAttribute(attr, value);
  return prev;
}

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = meta.title;
    const prev = [
      ['meta[name="description"]', 'content', setMeta('meta[name="description"]', 'content', meta.description)],
      ['link[rel="canonical"]', 'href', setMeta('link[rel="canonical"]', 'href', SITE + (meta.path === '/' ? '/' : meta.path))],
      ['meta[property="og:title"]', 'content', setMeta('meta[property="og:title"]', 'content', meta.title)],
      ['meta[property="og:description"]', 'content', setMeta('meta[property="og:description"]', 'content', meta.description)],
    ] as const;
    return () => {
      document.title = prevTitle;
      for (const [selector, attr, value] of prev) if (value !== null) document.querySelector(selector)?.setAttribute(attr, value);
    };
  }, [meta]);
}

// ---------- adornos ----------

export function Wave({ fill }: { fill: string }) {
  return (
    <svg className="wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 46 C 160 8 320 8 480 40 S 800 84 960 48 S 1280 6 1440 40 V80 H0 Z" fill={fill} />
    </svg>
  );
}

function Azulejo() {
  return (
    <svg className="azulejo" width="100%" height="48" aria-hidden="true">
      <defs>
        <pattern id="azl" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect width="48" height="48" fill="#F8F3E9" />
          <rect x="1" y="1" width="46" height="46" fill="none" stroke="#128099" strokeWidth="1.2" />
          <path d="M24 5 C27 15 33 21 43 24 C33 27 27 33 24 43 C21 33 15 27 5 24 C15 21 21 15 24 5 Z" fill="#128099" />
          <circle cx="24" cy="24" r="4" fill="#F0B04B" />
          <circle cx="0" cy="0" r="6" fill="#B04E2B" />
          <circle cx="48" cy="0" r="6" fill="#B04E2B" />
          <circle cx="0" cy="48" r="6" fill="#B04E2B" />
          <circle cx="48" cy="48" r="6" fill="#B04E2B" />
        </pattern>
      </defs>
      <rect width="100%" height="48" fill="url(#azl)" />
    </svg>
  );
}

export function Crumbs({ here }: { here: string }) {
  return (
    <nav className="crumbs" aria-label="Migas de pan">
      <Link to="/">Inicio</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{here}</span>
    </nav>
  );
}

export function FaqList({ items, className = 'faq' }: { items: ReadonlyArray<QA>; className?: string }) {
  return (
    <div className={className}>
      {items.map((item) => (
        <details key={item.q}>
          <summary>
            <span>{item.q}</span>
            <span aria-hidden="true">Ver</span>
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}

// ---------- contacto: no hay servidor detrás, así que el formulario abre WhatsApp con la pregunta escrita ----------

const SIZES = ['1 a 10', '11 a 30', '31 a 50', '51 a 100', 'Más de 100'] as const;

function ContactBand() {
  const [name, setName] = useState('');
  const [size, setSize] = useState<string>(SIZES[0]);
  const [zone, setZone] = useState('');
  const [question, setQuestion] = useState('');

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = [
      `Hola, soy ${name.trim()}.`,
      `Gestiono ${size === 'Más de 100' ? 'más de 100' : size} alojamientos${zone.trim() ? ` en ${zone.trim()}` : ''}.`,
      question.trim() || 'Me gustaría ver una demo de VisualTaste Guía.',
    ].join(' ');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <section className="band" id="contacto" aria-labelledby="t-contacto">
      <img src={IMG.do} alt="" loading="lazy" decoding="async" />
      <div className="wrap g2" style={{ alignItems: 'start' }}>
        <div>
          <p className="label">Pedir una demo</p>
          <h2 className="h2" id="t-contacto">
            Que tu huésped lo encuentre todo antes de <em>escribirte.</em>
          </h2>
          <p className="lead">
            Cuéntanos cuántos alojamientos gestionas y te enseñamos cómo se vería la guía en uno tuyo, con tu marca.
          </p>
          <div className="direct">
            <p>
              ¿Prefieres llamar? <a href={PHONE_TEL}>{PHONE_DISPLAY}</a>
            </p>
            <p>
              O escríbenos a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            </p>
          </div>
        </div>
        <form className="form" onSubmit={send}>
          <div className="fld">
            <label htmlFor="f-n">Nombre</label>
            <input id="f-n" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="fld">
            <label htmlFor="f-p">Alojamientos que gestionas</label>
            <select id="f-p" value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="fld w">
            <label htmlFor="f-z">Zona</label>
            <input id="f-z" type="text" placeholder="Málaga, Marbella…" value={zone} onChange={(e) => setZone(e.target.value)} />
          </div>
          <div className="fld w">
            <label htmlFor="f-q">Tu pregunta</label>
            <textarea id="f-q" value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>
          <div className="form-foot">
            <button className="btn btn-p" type="submit">
              Enviar por WhatsApp
            </button>
            <p className="fine">Se abre WhatsApp con tu mensaje escrito. Te contesta una persona del equipo.</p>
          </div>
        </form>
      </div>
    </section>
  );
}

// ---------- la página entera ----------

/** Enlace a una sección de la portada: Link de React Router, para que valga igual desde la portada que desde fuera. */
const home = (hash: string) => ({ pathname: '/', hash });

export function LandingShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname, hash } = useLocation();

  // Al cambiar de página se sube arriba; con #ancla se va a la sección (también al llegar desde otra página). De
  // golpe, no suave: el index.css de la guía pone scroll-behavior:smooth en todo, y llegar a una página nueva
  // deslizándose desde arriba marea (y en una pestaña en segundo plano la animación ni avanza).
  useEffect(() => {
    setMenuOpen(false);
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
  }, [pathname, hash]);

  // El menú del móvil se cierra con Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const links = (
    <>
      <Link to={home('#funciones')}>Funciones</Link>
      <Link to={PAGES.gestoras.path} aria-current={pathname === PAGES.gestoras.path ? 'page' : undefined}>
        Para gestoras
      </Link>
      <Link to={home('#precio')}>Precio</Link>
      <Link to={home('#comparar')}>Comparar</Link>
      <Link to={home('#preguntas')}>Preguntas</Link>
    </>
  );

  return (
    <div className="lp">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <header className="nav">
        <div className="nav-in">
          <Link className="mark" to="/" aria-label="VisualTaste Guía, ir al inicio">
            VisualTaste <small>Guía</small>
          </Link>
          <nav className="nav-links" aria-label="Principal">
            {links}
          </nav>
          <div className="nav-cta">
            <a className="btn btn-p btn-sm" href="#contacto">
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
        <nav className={`menu-panel${menuOpen ? '' : ' off'}`} id="menu-panel" aria-label="Menú">
          {links}
          <a className="btn btn-p" href="#contacto" onClick={() => setMenuOpen(false)}>
            Pedir una demo
          </a>
        </nav>
      </header>

      <main id="contenido">
        {children}
        <ContactBand />
      </main>

      <footer className="foot">
        <Azulejo />
        <div className="wrap foot-in">
          <div>
            <p className="mark">
              VisualTaste <small>Guía</small>
            </p>
            <p className="fine foot-p">
              La guía digital para apartamentos turísticos de VisualTaste, la plataforma de carta digital y guía para
              restaurantes y alojamientos del Mediterráneo.
            </p>
          </div>
          <div>
            <h4>Producto</h4>
            <ul>
              <li><Link to={PAGES.libro.path}>Libro de bienvenida digital</Link></li>
              <li><Link to={PAGES.conserje.path}>Conserje con IA</Link></li>
              <li><Link to={home('#funciones')}>Todas las funciones</Link></li>
              <li><a href="https://tv.visualtastes.com">VisualTaste TV</a></li>
            </ul>
          </div>
          <div>
            <h4>Para</h4>
            <ul>
              <li><Link to={PAGES.gestoras.path}>Gestoras de apartamentos</Link></li>
            </ul>
          </div>
          <div>
            <h4>Recursos</h4>
            <ul>
              <li><Link to={PAGES.comparar.path}>Comparar guías digitales</Link></li>
              <li><Link to={home('#precio')}>Precio</Link></li>
              <li><Link to={home('#preguntas')}>Preguntas</Link></li>
            </ul>
          </div>
          <div>
            <h4>VisualTaste</h4>
            <ul>
              <li><a href="#contacto">Contacto</a></li>
              <li><a href={PHONE_TEL}>{PHONE_DISPLAY}</a></li>
              <li><a href="https://visualtastes.com">Carta digital para restaurantes</a></li>
              <li><Link to="/legal">Privacidad y aviso legal</Link></li>
            </ul>
          </div>
        </div>
        <div className="wrap foot-c">
          <span>© {new Date().getFullYear()} VisualTaste</span>
          <span>Hecho en Málaga</span>
        </div>
      </footer>
    </div>
  );
}
