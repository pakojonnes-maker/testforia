// /para/gestoras-de-apartamentos — página de venta para gestoras (ver las reglas en src/pages/LandingPage.tsx).
import { useState, type CSSProperties } from 'react';
import { BRANDS, GESTORAS_FAQ, GESTORAS_LAYERS, GESTORAS_PAINS, PAGES } from './data';
import { IMG } from './images';
import { Crumbs, FaqList, LandingShell, Wave, usePageMeta } from './Shell';

export default function GestorasPage() {
  usePageMeta(PAGES.gestoras);
  const [brand, setBrand] = useState(0);

  return (
    <LandingShell>
      <section className="hero" aria-labelledby="t-hero">
        <img className="hero-bg" src={IMG.background} alt="" aria-hidden="true" />
        <div className="wrap hero-grid">
          <div>
            <Crumbs here={PAGES.gestoras.name} />
            <p className="label">Para gestoras de apartamentos turísticos</p>
            <h1 className="h1 s" id="t-hero">
              Cien pisos, cien guías, y lo escribes <em>una vez.</em>
            </h1>
            <p className="lead" style={{ maxWidth: '31em' }}>
              Lo de tu agencia, lo de cada zona y lo de cada piso, por separado. La playa de Burriana se escribe una vez y sale
              en todos tus pisos de Nerja.
            </p>
            <div className="cta-row">
              <a className="btn btn-p" href="#contacto">
                Pedir una demo
              </a>
              <a className="link" href="#precio-g">
                Ver el precio
              </a>
            </div>
            <p className="under">Tu marca en cada guía · 13 idiomas · Un panel para todos los pisos</p>
          </div>
          <div className="stage">
            <span className="sun" aria-hidden="true" />
            <div className="arch a45">
              <img src={IMG.info} alt="Una consola de entrada con un libro de normas y una tableta" decoding="async" />
            </div>
            <div className="snip" aria-hidden="true">
              <span className="s-t">Nerja · 14 pisos</span>
              <span className="s-m">Playas, restaurantes y planes de la zona: escritos una vez, en las 14 guías.</span>
            </div>
          </div>
        </div>
        <Wave fill="#EEDFC5" />
      </section>

      <section className="sec arena" aria-labelledby="t-hoy">
        <div className="wrap g57">
          <div>
            <p className="label">Lo que pasa hoy</p>
            <h2 className="h2" id="t-hoy">
              Tu equipo contesta lo mismo cien veces al <em>día.</em>
            </h2>
            <p className="lead">Y cada respuesta es un rato que no dedica a lo que de verdad necesita a una persona.</p>
          </div>
          <ol className="rows">
            {GESTORAS_PAINS.map(([q, a], i) => (
              <li className="row" key={q}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <p className="q">{q}</p>
                <p className="a">
                  <b>Con la guía</b>
                  {a}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec" aria-labelledby="t-capas">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">Cómo se reparte el trabajo</p>
            <h2 className="h2" id="t-capas">
              Tres capas, y cada cosa se escribe en <em>su sitio.</em>
            </h2>
          </div>
          <ol className="steps">
            {GESTORAS_LAYERS.map(([t, d], i) => (
              <li className="step" key={t}>
                <span className="step-n">{i + 1}</span>
                <h3 className="h3">{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec cal2" aria-labelledby="t-marca">
        <div className="wrap g2">
          <div>
            <p className="label">Tu marca, no la nuestra</p>
            <h2 className="h2" id="t-marca">
              El huésped ve tu agencia, de la entrada a la <em>salida.</em>
            </h2>
            <p className="lead">
              Elige el color y la guía calcula el resto con el contraste garantizado, para que se lea bien en cualquier móvil.
            </p>
            <div className="faq-tabs" role="group" aria-label="Color de marca">
              {BRANDS.map((b, i) => (
                <button type="button" className="chip" aria-pressed={i === brand} key={b.name} onClick={() => setBrand(i)}>
                  {b.name}
                </button>
              ))}
            </div>
          </div>
          <div className="brand-demo" aria-hidden="true">
            <div className="bd" style={{ '--bd': BRANDS[brand].hex } as CSSProperties}>
              <div className="bd-head">
                <p>Costa Azahar Apartamentos</p>
                <p>Bienvenidos a Casa Azahar</p>
              </div>
              <div className="bd-body">
                <div className="bd-tile fill">
                  <span className="k">WiFi</span>
                  <b>CasaAzahar_5G</b>
                  <span className="pill">Copiar la clave</span>
                </div>
                <div className="bd-tile">
                  <span className="k">Salida</span>
                  <b>Domingo, 11:00</b>
                  <span className="m">Llaves en el cajetín del portal.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" aria-labelledby="t-panel">
        <div className="wrap g2">
          <figure className="mod" aria-label="Ilustración del panel de visitas">
            <p className="label">Panel · todos los pisos · últimos 30 días</p>
            <ul className="incl">
              <li>
                <span>Sección más vista</span>
                <span>WiFi</span>
              </li>
              <li>
                <span>Idioma más usado después del español</span>
                <span>Inglés</span>
              </li>
              <li>
                <span>Restaurante con más interés</span>
                <span>La Mar Salada</span>
              </li>
            </ul>
            <figcaption className="fine">Ilustración con datos de ejemplo. Los reales salen en tu panel al empezar a medir.</figcaption>
          </figure>
          <div>
            <p className="label">Lo que mide el panel</p>
            <h2 className="h2" id="t-panel">
              Mide la guía, no a tus <em>huéspedes.</em>
            </h2>
            <p className="lead">
              Cuántos huéspedes abren la guía, qué secciones miran y en qué idioma. Sin cuentas ni perfiles: la medición es
              anónima y la guía no necesita banner de cookies para hacerla.
            </p>
          </div>
        </div>
      </section>

      <section className="sec hondo" id="precio-g" aria-labelledby="t-precio">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">Precio</p>
            <h2 className="h2" id="t-precio">
              Hasta 30 pisos, 50 € al mes. <em>Todo incluido.</em>
            </h2>
            <p className="lead">
              Una tarifa plana, sin IVA y con pago anual, como la de tu programa de gestión. Todo incluido: conserje con IA,
              panel, idiomas, tu marca y la app de la tele. Con 30 pisos, las guías internacionales cobran más del doble.
            </p>
          </div>
          <ul className="tiers t2">
            <li>
              <b>50 €</b>
              <span>al mes de 0 a 30 pisos, sin IVA</span>
            </li>
            <li>
              <b>A consultar</b>
              <span>más de 30 pisos</span>
            </li>
          </ul>
          <p className="fine" style={{ marginTop: 24, color: '#C9D6DB' }}>
            Sin cuota de alta ni permanencia; pago anual. La app de la tele, gratis; el aparato, un extra opcional si tu tele no
            la admite. En la Costa del Sol, precio especial: a consultar.
          </p>
        </div>
      </section>

      <section className="sec" aria-labelledby="t-faq">
        <div className="wrap g57">
          <div>
            <p className="label">Preguntas de gestoras</p>
            <h2 className="h2" id="t-faq">
              Lo que nos preguntan en la <em>demo.</em>
            </h2>
          </div>
          <FaqList items={GESTORAS_FAQ} className="faq top" />
        </div>
      </section>
    </LandingShell>
  );
}
