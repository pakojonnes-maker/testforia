// /funciones/conserje-ia — página de la función estrella (ver las reglas en src/pages/LandingPage.tsx).
import { useState } from 'react';
import { CHAT_DEMO, CONSERJE_FAQ, CONSERJE_NO, CONSERJE_SOURCES, CONSERJE_STEPS, CONSERJE_YES, PAGES } from './data';
import { IMG } from './images';
import { Crumbs, FaqList, LandingShell, Wave, usePageMeta } from './Shell';

export default function ConserjePage() {
  usePageMeta(PAGES.conserje);
  const [ask, setAsk] = useState(0);
  const cur = CHAT_DEMO[ask];

  return (
    <LandingShell>
      <section className="hero" aria-labelledby="t-hero">
        <img className="hero-bg" src={IMG.background} alt="" aria-hidden="true" />
        <div className="wrap hero-grid even">
          <div>
            <Crumbs here={PAGES.conserje.name} />
            <p className="label">Conserje con IA para apartamentos turísticos</p>
            <h1 className="h1 s" id="t-hero">
              Contesta a tus huéspedes a cualquier hora, con lo que <em>tú sabes.</em>
            </h1>
            <p className="lead" style={{ maxWidth: '30em' }}>
              Un conserje dentro de la guía que responde en el idioma del huésped con lo que has cargado: el WiFi, las normas,
              tus restaurantes, la zona. Si no lo sabe, lo dice y le da tu teléfono.
            </p>
            <div className="cta-row">
              <a className="btn btn-p" href="#contacto">
                Pedir una demo
              </a>
              <a className="link" href="#preguntas-c">
                Preguntas sobre el conserje
              </a>
            </div>
            <p className="under">Incluido en el precio · 13 idiomas · Sin registro del huésped</p>
          </div>
          <div>
            <div className="chat" aria-live="polite">
              <div className="chat-h">
                <b>Conserje · Casa Azahar</b>
                <span>Conversación de ejemplo</span>
              </div>
              <span className="bub u">{cur.q}</span>
              <span className="bub a">{cur.a}</span>
              {cur.card && (
                <div className="card">
                  <b>{cur.card[0]}</b>
                  <span>{cur.card[1]}</span>
                </div>
              )}
            </div>
            <p className="fine">Prueba otra pregunta:</p>
            <div className="faq-tabs" role="group" aria-label="Preguntas de ejemplo">
              {CHAT_DEMO.map((c, i) => (
                <button type="button" className="chip" aria-pressed={i === ask} key={c.label} onClick={() => setAsk(i)}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Wave fill="#F8F3E9" />
      </section>

      <section className="sec" aria-labelledby="t-src">
        <div className="wrap g57">
          <div>
            <p className="label">De dónde saca las respuestas</p>
            <h2 className="h2" id="t-src">
              Contesta con tu guía, no con lo que encuentra en <em>internet.</em>
            </h2>
            <p className="lead">El conserje lee la guía del piso entera y solo eso. Lo que marcas como oculto, no lo cuenta.</p>
          </div>
          <ul className="conn c3">
            {CONSERJE_SOURCES.map(([t, d]) => (
              <li key={t}>
                <b>{t}</b>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sec arena" aria-labelledby="t-yn">
        <div className="wrap">
          <div className="sec-head c">
            <p className="label">Sin sorpresas</p>
            <h2 className="h2" id="t-yn">
              Lo que hace, y lo que <em>no hace.</em>
            </h2>
          </div>
          <div className="yn">
            <div className="yn-col">
              <h3 className="h3">Hace</h3>
              <ul>
                {CONSERJE_YES.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="yn-col no-col">
              <h3 className="h3">No hace</h3>
              <ul>
                {CONSERJE_NO.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" aria-labelledby="t-act">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">Cómo se activa</p>
            <h2 className="h2" id="t-act">
              No hay que entrenarlo. Hay que rellenar la <em>guía.</em>
            </h2>
          </div>
          <ol className="steps">
            {CONSERJE_STEPS.map(([t, d], i) => (
              <li className="step" key={t}>
                <span className="step-n">{i + 1}</span>
                <h3 className="h3">{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sec cal2" id="preguntas-c" aria-labelledby="t-faq">
        <div className="wrap g57">
          <div>
            <p className="label">Preguntas</p>
            <h2 className="h2" id="t-faq">
              Sobre el conserje con <em>IA.</em>
            </h2>
          </div>
          <FaqList items={CONSERJE_FAQ} className="faq top" />
        </div>
      </section>
    </LandingShell>
  );
}
