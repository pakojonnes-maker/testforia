import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LEGAL_IDENTITY, SUBPROCESSORS, hasPendingFields, formattedLastUpdated } from '../lib/legalIdentity';
import { getConsent, setConsent, type ConsentState } from '../lib/consent';
import { useAgencyTheme } from '../theme/useAgencyTheme';
import '../styles/guide.css';
import '../styles/legal.css';
import '@fontsource-variable/montserrat/index.css';
import '@fontsource-variable/playfair-display/index.css';
import '@fontsource-variable/playfair-display/wght-italic.css';

// Página legal del guidebook: privacidad + aviso legal + panel para cambiar de
// idea sobre el consentimiento.
//
// El texto largo va en español e inglés. Los otros 11 idiomas activos caen a
// inglés, igual que hace getTranslation() para el resto de la interfaz. No es lo
// ideal — el art. 12 RGPD pide lenguaje comprensible para el destinatario — pero
// es mucho mejor que el estado anterior, que era no tener ningún texto legal, y
// deja la traducción como una tarea acotada de contenido, no de código.

type Lang = 'es' | 'en';

const pick = (lang: string): Lang => (lang === 'es' ? 'es' : 'en');

const T = {
  es: {
    title: 'Privacidad y aviso legal',
    updated: 'Última actualización',
    pending:
      'Este documento todavía no está listo para publicarse: faltan la razón social, el NIF y el domicilio del responsable (art. 10 LSSI y art. 13 RGPD). Complétalos en apps/guide/src/lib/legalIdentity.ts.',
    back: 'Volver',
    purposeLabel: 'Finalidad',
    locationLabel: 'Ubicación',
    consentTitle: 'Recordarte entre visitas',
    consentGranted: 'Está activado: guardamos un identificador aleatorio en tu dispositivo. Puedes desactivarlo cuando quieras.',
    consentDenied: 'Está desactivado. No hay nada guardado en tu dispositivo.',
    consentUnset: 'Está desactivado. No guardamos nada en tu dispositivo salvo que lo actives aquí.',
    revoke: 'Desactivar y borrar',
    grant: 'Activar',
    sections: [
      {
        h: '1. Quién es responsable de tus datos',
        p: [
          'Esta guía la publica el anfitrión o la agencia que gestiona tu alojamiento, con la tecnología de {{brand}} ({{company}}, NIF {{taxId}}, con domicilio en {{address}}).',
          'El anfitrión o la agencia es el responsable del contenido de la guía y de los datos que le facilites, por ejemplo al hacer un pedido en la Tienda. {{brand}} actúa como encargado del tratamiento (art. 28 RGPD) y, además, es responsable de la analítica de uso de la plataforma, porque somos nosotros quienes decidimos qué se mide.',
          'Para cualquier asunto de privacidad puedes escribir a {{privacyEmail}}.',
        ],
      },
      {
        h: '2. Qué recogemos, con qué base y cuánto dura',
        table: {
          head: ['Finalidad', 'Datos', 'Base jurídica', 'Conservación'],
          rows: [
            [
              'Mostrarte la guía',
              'Idioma elegido y datos técnicos mínimos de la petición.',
              'Interés legítimo: sin esto no hay servicio.',
              'Mientras dura la visita.',
            ],
            [
              'Medición de audiencia',
              'Secciones visitadas, tiempo de uso, tipo de dispositivo, sistema operativo, navegador, idioma, país y ciudad aproximados, y qué recomendaciones abres. Para no repetirte al contar, tu visita se identifica con un código calculado en nuestro servidor a partir de tu IP y tu navegador mezclados con un valor aleatorio que cambia cada día y se destruye: al día siguiente ese código ya no se puede relacionar con el de hoy, ni siquiera por nosotros.',
              'Interés legítimo (art. 6.1.f): estadísticas agregadas del propio servicio, sin identificarte y sin guardar nada en tu dispositivo.',
              '12 meses en forma agregada.',
            ],
            [
              'Recordarte entre visitas (opcional)',
              'Un identificador aleatorio guardado en tu dispositivo, para saber si vuelves otro día y para atribuir a este alojamiento una visita posterior a la carta de un restaurante.',
              'Tu consentimiento (art. 6.1.a). Está desactivado salvo que lo actives tú aquí abajo.',
              '12 meses la identificación, 30 días la atribución.',
            ],
            [
              'Asistente de IA',
              'El texto que escribes en el chat y las últimas respuestas, para dar continuidad a la conversación.',
              'Tu solicitud del servicio (art. 6.1.b) y nuestro interés legítimo en evitar el abuso.',
              'No guardamos el historial: se procesa en el momento y no queda almacenado en nuestra base de datos.',
            ],
            [
              'Pedidos de la Tienda',
              'Los productos que pides y un identificador de la sesión. El contacto se hace por WhatsApp y ahí se aplica la política de Meta.',
              'Ejecución del contrato (art. 6.1.b).',
              'Los plazos legales aplicables a la operación.',
            ],
          ],
        },
      },
      {
        h: '3. Qué guardamos en tu dispositivo',
        p: [
          'La ley exige tu permiso para guardar información en tu dispositivo, y eso incluye el almacenamiento local del navegador, no solo las cookies (art. 22.2 LSSI).',
          'Por defecto no guardamos NADA en tu dispositivo, y por eso esta guía no te recibe con un aviso de cookies: las estadísticas de uso se calculan en nuestro servidor sin dejarte nada puesto. Lo de abajo solo existe si tú lo activas.',
        ],
        table: {
          codeFirst: true,
          head: ['Nombre', 'Para qué', 'Duración'],
          rows: [
            ['vt_guide_consent', 'Recordar que activaste (o no) el recuerdo entre visitas. Solo se escribe si tocas los botones de abajo.', '12 meses'],
            ['vt_guide_visitor_id', 'Identificador aleatorio de visitante. Requiere tu consentimiento.', '12 meses'],
            ['vt_guide_ref', 'Saber que llegaste a la carta de un restaurante desde esta guía. Requiere tu consentimiento.', '30 días'],
          ],
        },
        after: [
          'Si no lo activas, no se escribe nada; si lo desactivas, borramos lo que hubiera. Puedes cambiar de idea aquí en cualquier momento, y llegar a esta página desde el icono de privacidad de la cabecera. No usamos cookies de terceros, ni publicidad, ni redes sociales.',
        ],
      },
      {
        h: '4. Asistente de inteligencia artificial',
        p: [
          'La guía incluye un asistente conversacional basado en inteligencia artificial. Te lo decimos de forma expresa porque el Reglamento (UE) 2024/1689 de Inteligencia Artificial obliga a ello.',
          'El asistente puede equivocarse o dar información desactualizada. No sustituye a tu anfitrión: confirma con él cualquier cosa importante, especialmente sobre acceso al alojamiento, horarios o seguridad.',
          'No escribas en el chat datos de salud, religión, orientación sexual ni ningún otro dato sensible. No los necesitamos y preferimos no tratarlos.',
        ],
      },
      {
        h: '5. Recomendaciones y colaboraciones comerciales',
        p: [
          'Algunos de los restaurantes, experiencias y productos que aparecen en esta guía son colaboraciones comerciales del anfitrión o de la agencia, que puede obtener una contraprestación si los contratas. Te lo indicamos allí donde aparecen para que puedas valorarlo.',
        ],
      },
      {
        h: '6. Quién más ve tus datos',
        p: ['Nos apoyamos en estos proveedores, que solo tratan los datos para lo que les encomendamos:'],
        providers: true,
        after: [
          'Algunos son empresas estadounidenses y pueden tratar datos fuera del Espacio Económico Europeo. Esas transferencias se amparan en las Cláusulas Contractuales Tipo de la Comisión Europea y, cuando procede, en el Marco de Privacidad de Datos UE-EE. UU. Puedes pedirnos copia de estas garantías.',
        ],
      },
      {
        h: '7. Tus derechos',
        p: [
          'Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad, y retirar tu consentimiento en cualquier momento, escribiendo a {{privacyEmail}}. Te responderemos en el plazo máximo de un mes.',
          'Si no quedas conforme, puedes reclamar ante la {{authority}}.',
        ],
      },
      {
        h: '8. Aviso legal',
        p: [
          'En cumplimiento del art. 10 de la Ley 34/2002 (LSSI-CE): titular {{company}}, NIF {{taxId}}, domicilio en {{address}}, correo electrónico {{contactEmail}}.',
          '{{brand}} presta el soporte tecnológico de esta guía. El contenido —descripciones, fotografías, códigos de acceso, recomendaciones y precios— lo introduce y mantiene el anfitrión o la agencia, que es su responsable. Cuando un pedido de la Tienda lo atiende directamente {{brand}}, el vendedor somos nosotros y así se te indicará antes de confirmarlo.',
          'Esta relación se rige por la legislación española. Si eres consumidor, puedes dirigir tu reclamación a {{contactEmail}} y acudir al órgano de consumo de tu comunidad autónoma o al Sistema Arbitral de Consumo.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy & legal notice',
    updated: 'Last updated',
    pending:
      'This document is not ready to publish yet: the legal name, tax ID and registered address are missing (art. 10 LSSI and art. 13 GDPR). Fill them in at apps/guide/src/lib/legalIdentity.ts.',
    back: 'Back',
    purposeLabel: 'Purpose',
    locationLabel: 'Location',
    consentTitle: 'Remembering you between visits',
    consentGranted: 'Switched on: we keep a random identifier on your device. You can switch it off whenever you like.',
    consentDenied: 'Switched off. Nothing is stored on your device.',
    consentUnset: 'Switched off. We store nothing on your device unless you switch it on here.',
    revoke: 'Switch off and delete',
    grant: 'Switch on',
    sections: [
      {
        h: '1. Who is responsible for your data',
        p: [
          'This guide is published by the host or agency managing your accommodation, using technology by {{brand}} ({{company}}, tax ID {{taxId}}, registered at {{address}}).',
          'The host or agency is the controller for the content of the guide and for any data you provide them, for example when placing a Store order. {{brand}} acts as a processor (art. 28 GDPR) and is additionally the controller for platform usage analytics, since we decide what is measured.',
          'For any privacy matter you can write to {{privacyEmail}}.',
        ],
      },
      {
        h: '2. What we collect, on what basis, and for how long',
        table: {
          head: ['Purpose', 'Data', 'Legal basis', 'Retention'],
          rows: [
            [
              'Showing you the guide',
              'Chosen language and minimal technical request data.',
              'Legitimate interest: without this there is no service.',
              'For the duration of your visit.',
            ],
            [
              'Audience measurement',
              'Sections visited, time spent, device type, operating system, browser, language, approximate country and city, and which recommendations you open. To avoid counting you twice, your visit is identified by a code computed on our server from your IP address and your browser, mixed with a random value that changes every day and is destroyed: the next day that code can no longer be linked to today’s, not even by us.',
              'Legitimate interest (art. 6.1.f): aggregate statistics about the service itself, without identifying you and without storing anything on your device.',
              '12 months, in aggregate form.',
            ],
            [
              'Remembering you between visits (optional)',
              'A random identifier stored on your device, to know whether you return on another day and to attribute to this accommodation a later visit to a restaurant’s menu.',
              'Your consent (art. 6.1.a). It is switched off unless you switch it on yourself on this page.',
              '12 months for identification, 30 days for attribution.',
            ],
            [
              'AI assistant',
              'The text you type in the chat and the most recent replies, to keep the conversation coherent.',
              'Your request for the service (art. 6.1.b) and our legitimate interest in preventing abuse.',
              'We do not keep the history: it is processed in the moment and not stored in our database.',
            ],
            [
              'Store orders',
              'The products you order and a session identifier. Contact happens over WhatsApp, where Meta’s own policy applies.',
              'Performance of a contract (art. 6.1.b).',
              'The statutory periods applicable to the transaction.',
            ],
          ],
        },
      },
      {
        h: '3. What we store on your device',
        p: [
          'The law requires your permission to store information on your device, and that includes browser local storage, not just cookies (art. 22.2 LSSI, art. 5.3 ePrivacy Directive).',
          'By default we store NOTHING on your device, which is why this guide does not greet you with a cookie notice: usage statistics are computed on our server without leaving anything behind. What follows only exists if you switch it on.',
        ],
        table: {
          codeFirst: true,
          head: ['Name', 'Purpose', 'Duration'],
          rows: [
            ['vt_guide_consent', 'Remembering whether you switched “Remembering you between visits” on (or not). It is only written if you press the buttons on this page.', '12 months'],
            ['vt_guide_visitor_id', 'Random visitor identifier. Requires your consent.', '12 months'],
            ['vt_guide_ref', 'Knowing you reached a restaurant menu from this guide. Requires your consent.', '30 days'],
          ],
        },
        after: [
          'If you never switch it on, nothing is written; if you switch it off, we delete whatever was there. You can change your mind here at any time, and reach this page from the privacy icon in the header. We use no third-party cookies, no advertising and no social network trackers.',
        ],
      },
      {
        h: '4. Artificial intelligence assistant',
        p: [
          'This guide includes a conversational assistant powered by artificial intelligence. We tell you explicitly because Regulation (EU) 2024/1689 (the AI Act) requires it.',
          'The assistant can be wrong or out of date. It does not replace your host: confirm anything important with them, especially about access to the property, timings or safety.',
          'Please do not type health, religious, sexual orientation or other sensitive data into the chat. We do not need it and would rather not process it.',
        ],
      },
      {
        h: '5. Recommendations and commercial partnerships',
        p: [
          'Some of the restaurants, experiences and products shown in this guide are commercial partnerships of the host or agency, who may receive a payment if you book them. We flag this where they appear so you can weigh it up.',
        ],
      },
      {
        h: '6. Who else sees your data',
        p: ['We rely on these providers, who only process data for what we instruct:'],
        providers: true,
        after: [
          'Some are US companies and may process data outside the European Economic Area. Those transfers rely on the European Commission’s Standard Contractual Clauses and, where applicable, the EU–US Data Privacy Framework. You can ask us for a copy of these safeguards.',
        ],
      },
      {
        h: '7. Your rights',
        p: [
          'You may exercise your rights of access, rectification, erasure, objection, restriction and portability, and withdraw your consent at any time, by writing to {{privacyEmail}}. We will reply within one month.',
          'If you are not satisfied, you may lodge a complaint with the {{authority}}.',
        ],
      },
      {
        h: '8. Legal notice',
        p: [
          'Pursuant to art. 10 of Spanish Law 34/2002 (LSSI-CE): owner {{company}}, tax ID {{taxId}}, registered address {{address}}, email {{contactEmail}}.',
          '{{brand}} provides the technology behind this guide. The content — descriptions, photographs, access codes, recommendations and prices — is entered and maintained by the host or agency, who is responsible for it. Where a Store order is fulfilled directly by {{brand}}, we are the seller and this is indicated before you confirm.',
          'This relationship is governed by Spanish law. If you are a consumer you may address your complaint to {{contactEmail}} and turn to the consumer authority of your region or the Spanish consumer arbitration system.',
        ],
      },
    ],
  },
} as const;

function interpolate(text: string): string {
  return text
    .replace(/\{\{brand\}\}/g, LEGAL_IDENTITY.brand)
    .replace(/\{\{company\}\}/g, LEGAL_IDENTITY.companyName)
    .replace(/\{\{taxId\}\}/g, LEGAL_IDENTITY.taxId)
    .replace(/\{\{address\}\}/g, LEGAL_IDENTITY.address)
    .replace(/\{\{contactEmail\}\}/g, LEGAL_IDENTITY.contactEmail)
    .replace(/\{\{privacyEmail\}\}/g, LEGAL_IDENTITY.privacyEmail)
    .replace(/\{\{authority\}\}/g, LEGAL_IDENTITY.supervisoryAuthority.name);
}

export default function LegalPage() {
  const [searchParams] = useSearchParams();
  const rawLang = searchParams.get('lang') || 'es';
  const lang = pick(rawLang);
  const t = T[lang];
  const [consent, setConsentState] = useState<ConsentState>('unset');
  // Esta página no depende de ningún piso, así que no hay agencia: los colores y las tipografías del diseño.
  // El idioma es el del TEXTO (es o en; el resto cae a inglés), no el del navegador: un documento en inglés
  // dentro de una página RTL se pintaba con la puntuación descolocada.
  useAgencyTheme(null, lang);

  useEffect(() => {
    setConsentState(getConsent());
  }, []);

  useEffect(() => {
    document.documentElement.dir = 'ltr';
    document.title = `${t.title} — ${LEGAL_IDENTITY.brand}`;
  }, [t.title]);

  const change = (state: 'granted' | 'denied') => {
    setConsent(state);
    setConsentState(state);
  };

  return (
    <div className="guide-app g-app g-legal" dir="ltr" lang={lang}>
      <header className="g-legal-h">
        <button type="button" className="g-back" onClick={() => window.history.back()}>{t.back}</button>
        <h1 className="g-h1">{t.title}</h1>
        <p className="g-meta">{t.updated}: {formattedLastUpdated(lang)}</p>
      </header>

      {hasPendingFields() && <div className="g-legal-warn" role="alert">{t.pending}</div>}

      {/* Panel para cambiar de idea. El art. 7.3 RGPD exige que retirar el
          consentimiento sea tan fácil como darlo, y hasta ahora en el guidebook
          no había forma alguna de hacerlo. */}
      <section className="g-consent">
        <h2 className="g-h3">{t.consentTitle}</h2>
        <p aria-live="polite">
          {consent === 'granted' ? t.consentGranted : consent === 'denied' ? t.consentDenied : t.consentUnset}
        </p>
        <div className="g-btns">
          {consent === 'granted' ? (
            <button type="button" className="g-pill line" onClick={() => change('denied')}>{t.revoke}</button>
          ) : (
            <button type="button" className="g-pill fill" onClick={() => change('granted')}>{t.grant}</button>
          )}
        </div>
      </section>

      {t.sections.map((section) => (
        <section key={section.h} className="g-lsec">
          <h2 className="g-h2">{section.h}</h2>

          {'p' in section && section.p?.map((paragraph, i) => <p key={i}>{interpolate(paragraph)}</p>)}

          {/* Una fila de tabla = una tarjeta: su primera columna es el título (o el nombre del dato guardado
              en el dispositivo, en monoespaciado) y cada columna restante lleva su rótulo. */}
          {'table' in section && section.table && (
            <div className="g-tcards">
              {section.table.rows.map((row, i) => (
                <div key={i} className="g-tcard">
                  <div>
                    {(section.table as { codeFirst?: boolean }).codeFirst ? <code>{row[0]}</code> : <h3 className="g-h3">{row[0]}</h3>}
                  </div>
                  {row.slice(1).map((cell, j) => (
                    <div key={j}>
                      <span>{section.table.head[j + 1]}</span>
                      <p>{cell}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {'providers' in section && section.providers && (
            <div className="g-tcards">
              {SUBPROCESSORS.map((s) => (
                <div key={s.name} className="g-tcard">
                  <div><h3 className="g-h3">{s.name}</h3></div>
                  <div><span>{t.purposeLabel}</span><p>{lang === 'es' ? s.purposeEs : s.purposeEn}</p></div>
                  <div><span>{t.locationLabel}</span><p>{s.location}</p></div>
                </div>
              ))}
            </div>
          )}

          {'after' in section && section.after?.map((paragraph, i) => <p key={i}>{interpolate(paragraph)}</p>)}
        </section>
      ))}
    </div>
  );
}
