// src/pages/LandingPage.tsx — Sales landing: Marino Andaluz, mobile-first
export default function LandingPage() {
  return (
    <div className="landing">
      {/* ====== HERO ====== */}
      <section className="landing-hero">
        <div className="landing-hero__badge">🏖️ Nuevo producto VisualTastes</div>

        <h1 className="landing-hero__title">
          El Guidebook digital para tus apartamentos turísticos
          <span>
            Transforma la experiencia de tus huéspedes con una guía digital interactiva.
            Restaurantes, experiencias y toda la info del piso — en 14 idiomas.
          </span>
        </h1>

        <div className="landing-hero__cta-group">
          <a href="mailto:info@visualtastes.com" className="landing-btn landing-btn--primary">
            Solicitar demo gratuita
          </a>
          <a href="#como-funciona" className="landing-btn landing-btn--secondary">
            Cómo funciona →
          </a>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className="landing-features" id="como-funciona">
        <div className="landing-features__header">
          <h2>Todo lo que tu huésped necesita, en un QR</h2>
          <p>
            Sin apps que descargar. Sin papeles que imprimir. Un código QR por apartamento
            que abre una guía completa y personalizada.
          </p>
        </div>

        <div className="landing-features__grid">
          {FEATURES.map((f, i) => (
            <div className="landing-feature" key={i}>
              <div className="landing-feature__icon">
                <span className="material-icons-round">{f.icon}</span>
              </div>
              <h3 className="landing-feature__title">{f.title}</h3>
              <p className="landing-feature__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== STEPS ====== */}
      <section className="landing-steps">
        <h2>Así de fácil funciona</h2>
        <div className="landing-steps__grid">
          {STEPS.map((s) => (
            <div className="landing-step" key={s.step}>
              <div className="landing-step__number">{s.step}</div>
              <div className="landing-step__emoji">{s.emoji}</div>
              <h4 className="landing-step__title">{s.title}</h4>
              <p className="landing-step__desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ====== PROOF ====== */}
      <section className="landing-proof">
        <h2 className="landing-proof__title">Creado para la Costa del Sol</h2>
        <p style={{ color: 'var(--gris-texto)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.6, fontSize: '.85rem' }}>
          VisualTastes ya trabaja con restaurantes en la zona. Ahora conectamos
          el alojamiento turístico con la gastronomía local.
        </p>

        <div className="landing-proof__stats">
          <div className="landing-stat">
            <div className="landing-stat__value">14</div>
            <div className="landing-stat__label">Idiomas soportados</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat__value">0€</div>
            <div className="landing-stat__label">Coste de entrada</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat__value">&lt;2min</div>
            <div className="landing-stat__label">Setup por piso</div>
          </div>
        </div>

        <div className="landing-proof__card">
          <p><strong>🎁 Guidebook gratuito para tu agencia</strong></p>
          <p>
            El Guidebook es gratis e incluye información del piso, POIs y experiencias.
            Los restaurantes aparecen gracias a su suscripción en VisualTastes.
          </p>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="landing-final-cta">
        <h2 className="landing-final-cta__title">¿Tienes apartamentos turísticos?</h2>
        <p className="landing-final-cta__desc">
          Ofrece algo más que unas llaves. Dale a tus huéspedes la mejor experiencia
          digital — gratis para tu agencia.
        </p>
        <a href="mailto:info@visualtastes.com" className="landing-btn landing-btn--primary">
          Contactar ahora
        </a>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="landing-footer">
        <p style={{ marginBottom: 4 }}>
          <strong style={{ color: 'rgba(255,255,255,.8)' }}>VisualTastes Guidebook</strong> — Parte del ecosistema{' '}
          <a href="https://visualtastes.com" target="_blank" rel="noopener">VisualTastes</a>
        </p>
        <p>© {new Date().getFullYear()} VisualTastes. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

// Data — keeps JSX clean
const FEATURES = [
  { icon: 'apartment', title: 'Información del apartamento', desc: 'WiFi, normas, check-in/out, parking, electrodomésticos... Todo traducido automáticamente al idioma del huésped.' },
  { icon: 'restaurant', title: 'Restaurantes con carta visual', desc: 'Conectado al ecosistema VisualTastes. Tus huéspedes ven los restaurantes de la zona con fotos reales.' },
  { icon: 'sailing', title: 'Experiencias locales', desc: 'Paseos en barco, motos de agua, clases de surf, tours... Los huéspedes reservan por WhatsApp o web.' },
  { icon: 'explore', title: 'Puntos de interés', desc: 'Playas, miradores, monumentos con fotos, descripciones y enlace directo a Google Maps.' },
  { icon: 'translate', title: '14 idiomas automáticos', desc: 'El guidebook detecta el idioma del navegador y muestra todo el contenido traducido.' },
  { icon: 'bar_chart', title: 'Analíticas para tu agencia', desc: 'Cuántos huéspedes escanean el QR, cuánto tiempo pasan, qué restaurantes les interesan.' },
];

const STEPS = [
  { step: '1', emoji: '📝', title: 'Crea tu agencia', desc: 'Registra tus apartamentos y añade la información de cada piso.' },
  { step: '2', emoji: '🖨️', title: 'Imprime el QR', desc: 'Cada piso tiene un QR único. Ponlo en la entrada o envíalo por Airbnb.' },
  { step: '3', emoji: '📱', title: 'El huésped escanea', desc: 'Abre la guía en su móvil, en su idioma. Sin apps ni descargas.' },
  { step: '4', emoji: '📊', title: 'Tú ves los datos', desc: 'Qué les interesa, cuánto tiempo pasan. Métricas reales para tu negocio.' },
];
