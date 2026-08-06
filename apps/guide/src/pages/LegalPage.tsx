import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LEGAL_IDENTITY, SUBPROCESSORS, hasPendingFields, formattedLastUpdated } from '../lib/legalIdentity';
import { getConsent, setConsent, type ConsentState } from '../lib/consent';
import { isRtl } from '../lib/i18n';

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
    consentTitle: 'Tus preferencias',
    consentGranted: 'Ahora mismo aceptas la analítica de uso.',
    consentDenied: 'Ahora mismo rechazas la analítica de uso. No estamos recogiendo datos.',
    consentUnset: 'Todavía no has elegido. Mientras tanto no recogemos ningún dato.',
    revoke: 'Retirar el consentimiento',
    grant: 'Aceptar la analítica',
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
              'Analítica de uso',
              'Identificador aleatorio de visitante, secciones visitadas, tiempo de uso, tipo de dispositivo, sistema operativo, navegador, idioma, país y ciudad aproximados, y qué recomendaciones abres.',
              'Tu consentimiento (art. 6.1.a). Sin él no se crea ninguna sesión.',
              '12 meses desde tu última visita.',
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
        ],
        table: {
          head: ['Nombre', 'Para qué', 'Duración'],
          rows: [
            ['vt_guide_consent', 'Recordar tu decisión sobre la analítica. Necesaria.', '12 meses'],
            ['vt_guide_visitor_id', 'Identificador aleatorio de visitante. Requiere tu consentimiento.', '12 meses'],
            ['vt_guide_ref', 'Saber que llegaste a la carta de un restaurante desde esta guía. Requiere tu consentimiento.', '30 días'],
          ],
        },
        after: [
          'Si rechazas, no se escribe nada de lo que requiere consentimiento y borramos lo que hubiera. No usamos cookies de terceros, ni publicidad, ni redes sociales.',
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
    consentTitle: 'Your preferences',
    consentGranted: 'You currently accept usage analytics.',
    consentDenied: 'You currently decline usage analytics. We are not collecting any data.',
    consentUnset: 'You have not chosen yet. In the meantime we collect nothing.',
    revoke: 'Withdraw consent',
    grant: 'Accept analytics',
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
              'Usage analytics',
              'Random visitor identifier, sections visited, time spent, device type, operating system, browser, language, approximate country and city, and which recommendations you open.',
              'Your consent (art. 6.1.a). Without it no session is created.',
              '12 months from your last visit.',
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
        ],
        table: {
          head: ['Name', 'Purpose', 'Duration'],
          rows: [
            ['vt_guide_consent', 'Remembering your analytics choice. Strictly necessary.', '12 months'],
            ['vt_guide_visitor_id', 'Random visitor identifier. Requires your consent.', '12 months'],
            ['vt_guide_ref', 'Knowing you reached a restaurant menu from this guide. Requires your consent.', '30 days'],
          ],
        },
        after: [
          'If you decline, nothing requiring consent is written and anything already stored is removed. We use no third-party cookies, no advertising and no social network trackers.',
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

  useEffect(() => {
    setConsentState(getConsent());
  }, []);

  useEffect(() => {
    document.documentElement.dir = isRtl(rawLang) ? 'rtl' : 'ltr';
    document.title = `${t.title} — ${LEGAL_IDENTITY.brand}`;
  }, [rawLang, t.title]);

  const change = (state: 'granted' | 'denied') => {
    setConsent(state);
    setConsentState(state);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface px-5 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <header>
          <button
            onClick={() => window.history.back()}
            className="font-label-md text-label-md text-primary uppercase tracking-wide mb-6 hover:opacity-70 transition-opacity"
          >
            ← {t.back}
          </button>
          <h1 className="font-display-md text-display-md text-on-background">{t.title}</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
            {t.updated}: {formattedLastUpdated(lang)}
          </p>
        </header>

        {hasPendingFields() && (
          <div className="border border-error/60 bg-error/10 p-4 font-body-sm text-body-sm">{t.pending}</div>
        )}

        {/* Panel para cambiar de idea. El art. 7.3 RGPD exige que retirar el
            consentimiento sea tan fácil como darlo, y hasta ahora en el guidebook
            no había forma alguna de hacerlo. */}
        <section className="border border-on-background/15 p-5">
          <h2 className="font-label-caps text-label-caps text-primary uppercase mb-2">{t.consentTitle}</h2>
          <p className="font-body-md text-body-md text-on-surface mb-4">
            {consent === 'granted' ? t.consentGranted : consent === 'denied' ? t.consentDenied : t.consentUnset}
          </p>
          <div className="flex gap-3 flex-wrap">
            {consent !== 'denied' && (
              <button
                onClick={() => change('denied')}
                className="py-2.5 px-5 font-label-md text-label-md uppercase tracking-wide border border-on-background/25 hover:border-on-background/50 transition-colors"
              >
                {t.revoke}
              </button>
            )}
            {consent !== 'granted' && (
              <button
                onClick={() => change('granted')}
                className="py-2.5 px-5 font-label-md text-label-md uppercase tracking-wide bg-primary text-on-primary hover:bg-primary-container transition-colors"
              >
                {t.grant}
              </button>
            )}
          </div>
        </section>

        {t.sections.map((section) => (
          <section key={section.h} className="flex flex-col gap-3">
            <h2 className="font-headline-sm text-headline-sm text-on-background">{section.h}</h2>

            {'p' in section &&
              section.p?.map((paragraph, i) => (
                <p key={i} className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {interpolate(paragraph)}
                </p>
              ))}

            {'table' in section && section.table && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse font-body-sm text-body-sm">
                  <thead>
                    <tr>
                      {section.table.head.map((h) => (
                        <th
                          key={h}
                          className="border border-on-background/15 bg-surface-container-low p-2.5 text-left text-on-background font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="border border-on-background/15 p-2.5 align-top text-on-surface-variant">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {'providers' in section && section.providers && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse font-body-sm text-body-sm">
                  <tbody>
                    {SUBPROCESSORS.map((s) => (
                      <tr key={s.name}>
                        <td className="border border-on-background/15 p-2.5 text-on-background font-semibold align-top">
                          {s.name}
                        </td>
                        <td className="border border-on-background/15 p-2.5 text-on-surface-variant align-top">
                          {lang === 'es' ? s.purposeEs : s.purposeEn}
                        </td>
                        <td className="border border-on-background/15 p-2.5 text-on-surface-variant align-top whitespace-nowrap">
                          {s.location}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {'after' in section &&
              section.after?.map((paragraph, i) => (
                <p key={i} className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {interpolate(paragraph)}
                </p>
              ))}
          </section>
        ))}
      </div>
    </div>
  );
}
