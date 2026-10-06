// /comparar/guias-digitales — comparación completa, con lo que no hacemos (ver las reglas en src/pages/LandingPage.tsx).
// La competencia no se nombra: «guía internacional A».
import { FOR_US, FULL_COMPARE, FULL_COMPARE_SOURCES, NOT_FOR_US, PAGES, type CompareCell } from './data';
import { Crumbs, LandingShell, usePageMeta } from './Shell';

const cls = (c: CompareCell) => (c.no ? 'no' : undefined);

export default function CompararPage() {
  usePageMeta(PAGES.comparar);

  return (
    <LandingShell>
      <section className="sec tight" style={{ paddingBottom: 40 }} aria-labelledby="t-hero">
        <div className="wrap">
          <Crumbs here={PAGES.comparar.name} />
          <div className="sec-head">
            <p className="label" style={{ marginTop: 26 }}>
              Comparar guías digitales para alojamientos
            </p>
            <h1 className="h1 s" id="t-hero">
              Qué hace cada opción, y también lo que <em>no hacemos.</em>
            </h1>
            <p className="lead">
              Una comparación con lo que cada uno publica. Si lo que necesitas lo hace mejor otra herramienta, te lo decimos
              aquí antes que en la demo.
            </p>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }} aria-label="Tabla comparativa">
        <div className="wrap">
          <p className="swipe">Desliza la tabla para ver todas las columnas.</p>
          <div className="tbox" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Comparación</span>
                  </th>
                  <th>PDF o carpeta</th>
                  <th>Guía internacional A</th>
                  <th className="us">VisualTaste</th>
                </tr>
              </thead>
              <tbody>
                {FULL_COMPARE.map((r) => (
                  <tr key={r.row}>
                    <th scope="row">{r.row}</th>
                    <td className={cls(r.pdf)}>{r.pdf.t}</td>
                    <td className={cls(r.a)}>{r.a.t}</td>
                    <td className={r.us.plain ? 'us plain' : 'us'}>{r.us.t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine mt-s">{FULL_COMPARE_SOURCES}</p>
        </div>
      </section>

      <section className="sec arena" aria-labelledby="t-no">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">Con franqueza</p>
            <h2 className="h2" id="t-no">
              Cuándo te conviene otra <em>herramienta.</em>
            </h2>
          </div>
          <div className="g3 mt-l">
            {NOT_FOR_US.map(([t, d], i) => (
              <article className="mod" key={t}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="h3">{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" aria-labelledby="t-si">
        <div className="wrap">
          <div className="sec-head">
            <p className="label">Y cuándo sí</p>
            <h2 className="h2" id="t-si">
              Si lo que quieres es que el huésped no tenga que <em>preguntar.</em>
            </h2>
          </div>
          <div className="g3 mt-l">
            {FOR_US.map(([t, d], i) => (
              <article className={`mod${i === FOR_US.length - 1 ? ' dark' : ''}`} key={t}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="h3">{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </LandingShell>
  );
}
