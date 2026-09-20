// El móvil del héroe: la guía a 390×844 px reales, escalada, con recorrido automático de pestañas, selector
// de color de marca y leyenda. Es una VISTA PREVIA del diseño nuevo con datos ficticios («Casa Azahar»).
import { useEffect, useMemo, useState } from 'react';
import { BRANDS, TABS, type TabId } from './data';
import { IMG } from './images';
import { SCREENS } from './phoneScreens';

const TOUR_MS = 3400;

/** Sustituye los marcadores @@foto@@ por las URL reales (con hash) de las fotos importadas. */
const fillImages = (html: string) => html.replace(/@@(\w+)@@/g, (_, key: string) => (IMG as Record<string, string>)[key] ?? '');

export default function PhoneDemo() {
  const [tab, setTab] = useState<TabId>('casa');
  const [touched, setTouched] = useState(false);
  const [brand, setBrand] = useState(0);

  const screens = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.id, fillImages(SCREENS[t.id])])) as Record<TabId, string>,
    [],
  );

  // La guía se recorre sola hasta que el visitante toca o enfoca algo; con «reducir movimiento», no se mueve.
  useEffect(() => {
    if (touched || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setTab((cur) => TABS[(TABS.findIndex((t) => t.id === cur) + 1) % TABS.length].id);
    }, TOUR_MS);
    return () => window.clearInterval(id);
  }, [touched]);

  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  const choose = (id: TabId) => {
    setTouched(true);
    setTab(id);
  };

  return (
    <div className="hero-phone">
      <div className="ph-stage">
        <div className="ph-arch" aria-hidden="true" />
        <div className="ph-sun" aria-hidden="true" />
        <div className="phone">
          <div className="pclip">
            <div className="pscale">
              <div className={`g vp tour b-${BRANDS[brand].id}`} lang="es" dir="ltr" style={{ height: 844 }}>
                {/* `inert`: el contenido de la maqueta no se puede enfocar ni se anuncia; solo la barra de pestañas es interactiva. */}
                {TABS.map((t) => (
                  <div
                    key={t.id}
                    inert
                    className={`g-scr${t.id === 'tienda' ? ' has-cart' : ''}${t.id === tab ? ' on' : ''}`}
                    dangerouslySetInnerHTML={{ __html: screens[t.id] }}
                  />
                ))}
                <nav className="g-nav" aria-label="Secciones de la guía de ejemplo">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`g-navb${t.id === tab ? ' on' : ''}`}
                      aria-current={t.id === tab ? 'page' : undefined}
                      onClick={() => choose(t.id)}
                      onFocus={() => setTouched(true)}
                    >
                      {t.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="cap">
        <p className="cap-k">En el móvil</p>
        <p className="cap-t">{current.label}</p>
        <p className="cap-d">{current.desc}</p>
      </div>

      <div className="brand">
        <p className="cap-k">
          El color de tu marca · <b>{BRANDS[brand].name}</b>
        </p>
        <div className="swatches">
          {BRANDS.map((b, i) => (
            <button
              key={b.id}
              type="button"
              className={`sw${i === brand ? ' on' : ''}`}
              style={{ background: b.swatch }}
              aria-label={`Color de marca: ${b.name}`}
              aria-pressed={i === brand}
              onClick={() => setBrand(i)}
            />
          ))}
        </div>
      </div>

      <p className="fine">Ejemplo con datos ficticios. La guía se recorre sola hasta que tocas una pestaña.</p>
    </div>
  );
}
