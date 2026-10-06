// /guias/libro-de-bienvenida-digital — página que contesta una búsqueda (ver las reglas en src/pages/LandingPage.tsx).
import { CHECKLIST, FORMATS, LIBRO_FAQ, LIBRO_STEPS, PAGES } from './data';
import { IMG } from './images';
import { Crumbs, FaqList, LandingShell, Wave, usePageMeta } from './Shell';

export default function LibroBienvenidaPage() {
  usePageMeta(PAGES.libro);

  return (
    <LandingShell>
      <section className="hero" aria-labelledby="t-hero">
        <img className="hero-bg" src={IMG.background} alt="" aria-hidden="true" />
        <div className="wrap hero-grid">
          <div>
            <Crumbs here={PAGES.libro.name} />
            <p className="label">Libro de bienvenida para Airbnb, Booking y alquiler vacacional</p>
            <h1 className="h1 s" id="t-hero">
              El libro de bienvenida digital de tu apartamento, y qué debe <em>llevar.</em>
            </h1>
            <p className="lead" style={{ maxWidth: '31em' }}>
              La lista de lo que tu huésped va a buscar, en el orden en que lo va a buscar. Úsala con nuestra guía o con la
              carpeta de toda la vida.
            </p>
            <div className="cta-row">
              <a className="btn btn-p" href="#lista">
                Ver la lista
              </a>
              <a className="link" href="#contacto">
                Montarlo con VisualTaste
              </a>
            </div>
          </div>
          <div className="stage">
            <span className="sun" aria-hidden="true" />
            <div className="arch a45">
              <img src={IMG.wifi} alt="Unas llaves y un cartel con el WiFi de la casa sobre una consola de madera" decoding="async" />
            </div>
          </div>
        </div>
        <Wave fill="#F8F3E9" />
      </section>

      <section className="sec tight" aria-labelledby="t-def">
        <div className="wrap g57 mid">
          <h2 className="h2" id="t-def" style={{ marginTop: 0 }}>
            ¿Qué es un libro de bienvenida <em>digital?</em>
          </h2>
          <div>
            <p className="lead def">
              Es la información del alojamiento que el huésped necesita durante su estancia (cómo entrar, el WiFi, las normas,
              la salida y qué hacer en la zona), en una página que abre en el móvil con un QR o un enlace.
            </p>
            <p className="lead">
              También se le llama manual de la casa, guía del huésped o guidebook. A diferencia de la carpeta de papel, se
              actualiza sin reimprimir y se puede leer en el idioma del huésped.
            </p>
          </div>
        </div>
      </section>

      <section className="sec arena" id="lista" aria-labelledby="t-lista">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">La lista</p>
            <h2 className="h2" id="t-lista">
              Doce cosas que tu huésped va a <em>buscar.</em>
            </h2>
            <p className="lead">Ordenadas por el momento en que las busca. Al final de cada una, dónde va en VisualTaste.</p>
          </div>
          <ol className="chk">
            {CHECKLIST.map(([t, d, where], i) => (
              <li key={t}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <b>{t}</b>
                <span>
                  {d} <em>En VisualTaste: {where}.</em>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec" aria-labelledby="t-fmt">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">Formatos</p>
            <h2 className="h2" id="t-fmt">
              Carpeta, PDF o guía digital: en qué se <em>diferencian.</em>
            </h2>
          </div>
          <p className="swipe">Desliza la tabla para ver todas las columnas.</p>
          <div className="tbox">
            <table>
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Formato</span>
                  </th>
                  <th>Carpeta en papel</th>
                  <th>PDF por WhatsApp</th>
                  <th className="us">Guía digital VisualTaste</th>
                </tr>
              </thead>
              <tbody>
                {FORMATS.map((r) => (
                  <tr key={r.row}>
                    <th scope="row">{r.row}</th>
                    <td className={r.paper.no ? 'no' : undefined}>{r.paper.t}</td>
                    <td className={r.pdf.no ? 'no' : undefined}>{r.pdf.t}</td>
                    <td className="us">{r.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="sec cal2" aria-labelledby="t-pasos">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">Cómo montarlo con VisualTaste</p>
            <h2 className="h2" id="t-pasos">
              De la lista a la guía en tres <em>pasos.</em>
            </h2>
          </div>
          <ol className="steps">
            {LIBRO_STEPS.map(([t, d], i) => (
              <li className="step" key={t}>
                <span className="step-n">{i + 1}</span>
                <h3 className="h3">{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec" aria-labelledby="t-faq">
        <div className="wrap g57">
          <div>
            <p className="label">Preguntas</p>
            <h2 className="h2" id="t-faq">
              Sobre el libro de <em>bienvenida.</em>
            </h2>
          </div>
          <FaqList items={LIBRO_FAQ} className="faq top" />
        </div>
      </section>
    </LandingShell>
  );
}
