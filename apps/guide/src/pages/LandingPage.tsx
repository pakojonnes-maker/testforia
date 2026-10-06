// src/pages/LandingPage.tsx — landing comercial de guide.visualtastes.com (ruta /)
//
// Oct-2026: estructura de contenido de las landings de las guías internacionales (H1 con la búsqueda, recorrido
// del huésped, perfiles, precio y comparativa en la portada, preguntas por temas) con lo que hace nuestra guía y
// el diseño de sep-2026 (Playfair + Montserrat, terracota, arcos, olas y azulejo, sin iconos). El diseño vive en el
// Design artifact «Landing guía — ideas TouchStay»; el copy, en landing/data.ts; lo común, en landing/Shell.tsx.
//
// Reglas que conviene no romper:
//  - Solo se afirma lo que la guía hace hoy en producción, y la competencia no se nombra (ver landing/data.ts).
//  - Las tipografías vienen de @fontsource-variable (familias «… Variable»).
//  - Cada página de venta nueva necesita: su ruta en App.tsx ANTES de /:slug y con dos tramos (/:slug coge
//    cualquier ruta de uno), su entrada en src/prerender.tsx, su excepción al noindex en public/_headers, su <url> en
//    public/sitemap.xml y su ruta en la lista del script en línea de index.html.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  COMPARE,
  COMPARE_SOURCES,
  CONNECTIONS,
  FAQ_TOPICS,
  FEATURES,
  JOURNEY,
  PAGES,
  PRICE_BARS,
  type CompareCell,
} from './landing/data';
import { IMG } from './landing/images';
import { FaqList, LandingShell, Wave, usePageMeta } from './landing/Shell';

function Cell({ c, us }: { c: CompareCell; us?: boolean }) {
  return (
    <td className={us ? 'us' : c.no ? 'no' : undefined}>
      {c.t}
      {c.s && <span className="td-s">{c.s}</span>}
    </td>
  );
}

export default function LandingPage() {
  usePageMeta(PAGES.home);
  const [topic, setTopic] = useState(FAQ_TOPICS[0].id);

  return (
    <LandingShell>
      {/* ============ PORTADA ============ */}
      <section className="hero" aria-labelledby="t-hero">
        <img className="hero-bg" src={IMG.background} alt="" aria-hidden="true" />
        <div className="wrap hero-grid">
          <div>
            <p className="label">Guía digital para apartamentos turísticos</p>
            <h1 className="h1" id="t-hero">
              La guía que responde a tus huéspedes antes de que te <em>escriban.</em>
            </h1>
            <p className="lead" style={{ maxWidth: '31em' }}>
              WiFi, normas, cómo entrar, dónde comer, qué hacer y un conserje que contesta a cualquier hora. En el móvil del
              huésped, en su idioma y sin instalar nada.
            </p>
            <ul className="feat-line">
              <li>Conserje con IA</li>
              <li>Tienda de extras</li>
              <li>Restaurantes con reserva</li>
              <li>Mapa de la zona</li>
              <li>13 idiomas</li>
              <li>La tele del salón</li>
            </ul>
            <div className="cta-row">
              <a className="btn btn-p" href="#contacto">
                Pedir una demo
              </a>
              <a className="link" href="#precio">
                Ver el precio
              </a>
            </div>
            <p className="under">Sin app para el huésped · Un QR por alojamiento · Medición anónima</p>
          </div>
          <div className="stage">
            <span className="sun" aria-hidden="true" />
            <div className="arch a45">
              <img
                src={IMG.stay}
                alt="Un libro de bienvenida y una llave sobre una mesa, junto a una ventana luminosa"
                decoding="async"
              />
            </div>
            <div className="snip" aria-hidden="true">
              <span className="bub u">¿A qué hora hay que salir el domingo?</span>
              <span className="bub a">A las 11:00. Deja las llaves en el cajetín del portal y la basura en el contenedor de la esquina.</span>
            </div>
          </div>
        </div>
        <Wave fill="#06415C" />
      </section>

      {/* ============ PROGRAMA FUNDADOR (en lugar de testimonios: no los tenemos) ============ */}
      <section className="sec tight hondo" aria-labelledby="t-fund">
        <div className="wrap g57 mid">
          <div>
            <p className="label">Programa fundador</p>
            <h2 className="h2" id="t-fund">
              Somos nuevos, y buscamos a las <em>primeras 10 gestoras.</em>
            </h2>
          </div>
          <div>
            <p className="lead" style={{ marginTop: 0 }}>
              No te vamos a enseñar logos ni estrellas que todavía no tenemos. Te ofrecemos lo que se puede ofrecer al
              empezar: precio de fundador y que te montemos la guía nosotros. Y si tus pisos están en la Costa del Sol, un
              precio todavía más bajo: aquí nació VisualTaste.
            </p>
            <ul className="tiers">
              <li>
                <b>Gratis</b>
                <span>hasta el 31 de mayo de 2027</span>
              </li>
              <li>
                <b>Costa del Sol</b>
                <span>precio especial, a consultar</span>
              </li>
              <li>
                <b>Montada</b>
                <span>la primera guía, por nuestra cuenta</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ============ COMPARATIVA: solo filas en las que no perdemos, con fuente y fecha ============ */}
      <section className="sec" id="comparar" aria-labelledby="t-comp">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">Comparar</p>
            <h2 className="h2" id="t-comp">
              La competencia internacional cuesta <em>más del doble.</em>
            </h2>
            <p className="lead">
              Con 30 pisos, dos de las guías digitales más usadas en Europa cobran entre 117 y 122 € al mes. VisualTaste
              cuesta 50 €, con el conserje con IA y la tienda incluidos.
            </p>
          </div>
          <div
            className="bars mt-m"
            role="img"
            aria-label="Precio al mes con 30 pisos: VisualTaste 50 euros, guía internacional A 117,08 euros, guía internacional B 122,50 euros"
          >
            {PRICE_BARS.map((b) => (
              <div className={`bar${b.us ? ' us' : ''}`} key={b.name}>
                <span className="bar-n">{b.name}</span>
                <span className="bar-t">
                  <i style={{ width: `${b.pct}%` }} />
                </span>
                <b>{b.price}</b>
              </div>
            ))}
          </div>
          <p className="swipe">Desliza la tabla para ver la competencia.</p>
          <div className="tbox">
            <table>
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Comparación</span>
                  </th>
                  <th className="us">VisualTaste</th>
                  <th>Guía internacional A</th>
                  <th>Guía internacional B</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r) => (
                  <tr key={r.row}>
                    <th scope="row">{r.row}</th>
                    <Cell c={r.us} us />
                    <Cell c={r.a} />
                    <Cell c={r.b} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine mt-s">{COMPARE_SOURCES}</p>
          <p className="mt-s">
            <Link className="link" to={PAGES.comparar.path}>
              Ver la comparación completa, también lo que no hacemos
            </Link>
          </p>
        </div>
      </section>

      {/* ============ PRECIO ============ */}
      <section className="sec arena" id="precio" aria-labelledby="t-precio">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">Precio</p>
            <h2 className="h2" id="t-precio">
              Hasta 30 pisos, 50 € al mes. <em>Todo incluido.</em>
            </h2>
            <p className="lead">
              Una tarifa plana, con pago anual, como la de tu programa de gestión. Conserje con IA, estadísticas, tienda, 13
              idiomas y la app de la tele, sin pagar más.
            </p>
          </div>
          <div className="price mt-m">
            <div className="price-a">
              <p className="label">De 0 a 30 pisos</p>
              <b className="big">50 €</b>
              <span className="per">al mes sin IVA, todo incluido, en un pago anual de 600 €. Con 30 pisos sale a 1,67 € cada uno.</span>
              <div className="cta-row">
                <a className="btn btn-c" href="#contacto">
                  Pedir una demo
                </a>
              </div>
              <p className="fine">Sin cuota de alta · Sin permanencia · Pago anual</p>
            </div>
            <div className="price-b">
              <p className="label">Precios sin IVA</p>
              <ul className="incl">
                <li>
                  <span>De 0 a 30 pisos</span>
                  <span>50 € al mes</span>
                </li>
                <li>
                  <span>Más de 30 pisos</span>
                  <span>A consultar</span>
                </li>
              </ul>
              <p className="fine">
                En todos: conserje con IA, estadísticas, tienda de extras, 13 idiomas, tu marca y la app de VisualTaste TV. Si
                tu tele no admite la app, el aparato que la conecta es un extra opcional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FUNCIONES ============ */}
      <section className="sec" id="funciones" aria-labelledby="t-fun">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">Funciones</p>
            <h2 className="h2" id="t-fun">
              Todo lo que pregunta un huésped, en <em>una sola guía.</em>
            </h2>
            <p className="lead">Lo escribes una vez en el panel. La guía lo enseña, lo traduce y lo contesta.</p>
          </div>
          <div className="g4 mt-l">
            {FEATURES.map((f, i) => (
              <article className={`mod${f.dark ? ' dark' : ''}`} key={f.title}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="h3">{f.title}</h3>
                <p>{f.text}</p>
                {f.to && (
                  <Link className="link" to={f.to}>
                    Saber más
                  </Link>
                )}
                {f.href && (
                  <a className="link" href={f.href}>
                    {f.cta ?? 'Saber más'}
                  </a>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ RECORRIDO DEL HUÉSPED ============ */}
      <section className="sec arena" aria-labelledby="t-jr">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">El recorrido del huésped</p>
            <h2 className="h2" id="t-jr">
              Una guía para toda la estancia, de la reserva a la <em>salida.</em>
            </h2>
          </div>
          <div className="jr">
            {JOURNEY.map((col, i) => (
              <div className="jr-col" key={col.k}>
                <p className="jr-k">
                  <b>{i + 1}</b>
                  <span>{col.k}</span>
                </p>
                <h3 className="h3">{col.title}</h3>
                <ul className="jr-list">
                  {col.items.map(([t, d]) => (
                    <li key={t}>
                      <b>{t}</b>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PARA QUIÉN ============ */}
      <section className="sec" aria-labelledby="t-who">
        <div className="wrap">
          <div className="sec-head c">
            <p className="label">Para quién es</p>
            <h2 className="h2" id="t-who">
              Pensada para quien vive de <em>alojar.</em>
            </h2>
          </div>
          <div className="g3 mt-l">
            <article className="who">
              <div className="arch soft a54">
                <img loading="lazy" decoding="async" src={IMG.wifi} alt="Unas llaves y un cartel con el WiFi de la casa sobre una consola de madera" />
              </div>
              <p className="label">Anfitriones con uno o dos pisos</p>
              <h3 className="h3">Deja de contestar lo mismo a las once de la noche.</h3>
              <ul>
                <li>Montas la guía importando tu anuncio de Airbnb.</li>
                <li>Un QR para la entrada y un enlace para la reserva.</li>
                <li>El conserje contesta por ti, a cualquier hora.</li>
              </ul>
            </article>
            <article className="who">
              <div className="arch soft a54">
                <img loading="lazy" decoding="async" src={IMG.info} alt="Una consola de entrada con un libro de normas y una tableta" />
              </div>
              <p className="label">Gestoras de apartamentos</p>
              <h3 className="h3">Veinte pisos o doscientos, una sola forma de hacer las cosas.</h3>
              <ul>
                <li>Lo de la zona se escribe una vez y vale para todos sus pisos.</li>
                <li>Tu marca en cada guía: logo, color y tipografía.</li>
                <li>Un panel con todos los alojamientos.</li>
              </ul>
              <Link className="link" to={PAGES.gestoras.path}>
                Ver la guía para gestoras
              </Link>
            </article>
            <article className="who">
              <div className="arch soft a54">
                <img loading="lazy" decoding="async" src={IMG.store} alt="Aceite de oliva y aceitunas sobre una mesa de madera, en una terraza con vistas al mar" />
              </div>
              <p className="label">Casas rurales y hoteles pequeños</p>
              <h3 className="h3">La recepción, también cuando no hay nadie en ella.</h3>
              <ul>
                <li>Horarios, normas y servicios de la casa, siempre a mano.</li>
                <li>Tus extras a la venta: desayunos, traslados, excursiones.</li>
                <li>Huéspedes de fuera, cada uno en su idioma.</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* ============ CONEXIONES ============ */}
      <section className="sec tight cal2" aria-labelledby="t-con">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">Conexiones</p>
            <h2 className="h2" id="t-con">
              Trae lo que ya tienes en otros <em>sitios.</em>
            </h2>
          </div>
          <ul className="conn">
            {CONNECTIONS.map(([t, d]) => (
              <li key={t}>
                <b>{t}</b>
                <span>{d}</span>
              </li>
            ))}
          </ul>
          <p className="fine mt-s">
            Todavía no nos conectamos con programas de gestión (Icnea, AvaiBook, Guesty…). Si lo necesitas, dínoslo en la demo.
          </p>
        </div>
      </section>

      {/* ============ PREGUNTAS ============ */}
      <section className="sec" id="preguntas" aria-labelledby="t-faq">
        <div className="wrap g57">
          <div>
            <p className="label">Preguntas</p>
            <h2 className="h2" id="t-faq">
              Lo que suele preguntar quien gestiona <em>alojamientos.</em>
            </h2>
            <p className="lead">
              Y si no está aquí,{' '}
              <a className="link" href="#contacto">
                pregúntanos.
              </a>
            </p>
          </div>
          <div>
            <div className="faq-tabs top" role="group" aria-label="Temas">
              {FAQ_TOPICS.map((t) => (
                <button type="button" className="chip" aria-pressed={t.id === topic} key={t.id} onClick={() => setTopic(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* Todos los temas en el HTML (las 20 preguntas del JSON-LD tienen que estar en la página); se ve uno. */}
            {FAQ_TOPICS.map((t) => (
              <div key={t.id} hidden={t.id !== topic}>
                <FaqList items={t.items} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </LandingShell>
  );
}
