// Identidad legal del prestador del servicio.
//
// ⚠️ GEMELO: apps/client/src/legal/identity.ts tiene los MISMOS valores. Si
// cambias uno, cambia el otro. Ver allí la razón de no haberlo extraído a un
// paquete compartido.

const PENDING_PREFIX = '⚠️ PENDIENTE';

export const LEGAL_IDENTITY = {
  brand: 'VisualTaste',
  companyName: `${PENDING_PREFIX}: razón social`,
  taxId: `${PENDING_PREFIX}: NIF`,
  address: `${PENDING_PREFIX}: domicilio social`,
  registryData: null as string | null,
  contactEmail: 'info@visualtastes.com',
  privacyEmail: 'privacidad@visualtastes.com',
  domains: {
    main: 'visualtastes.com',
    menu: 'menu.visualtastes.com',
    guide: 'guide.visualtastes.com',
  },
  /** Actualízala a mano al cambiar los textos legales. */
  lastUpdated: '2026-08-03',
  supervisoryAuthority: {
    name: 'Agencia Española de Protección de Datos (AEPD)',
    url: 'https://www.aepd.es',
  },
} as const;

/** Encargados con acceso a datos. Debe estar publicado (art. 13.1.e RGPD). */
export const SUBPROCESSORS = [
  {
    name: 'Cloudflare, Inc.',
    purposeEs: 'Alojamiento, base de datos, almacenamiento de medios, caché y asistente de IA',
    purposeEn: 'Hosting, database, media storage, cache and AI assistant',
    location: 'EE. UU. / red global',
  },
  {
    name: 'Google LLC',
    purposeEs: 'Datos de establecimientos (Google Places) y tipografías web',
    purposeEn: 'Place data (Google Places) and web fonts',
    location: 'EE. UU.',
  },
  {
    name: 'Meta Platforms, Inc.',
    purposeEs: 'Enlaces de contacto por WhatsApp cuando el huésped decide usarlos',
    purposeEn: 'WhatsApp contact links, when the guest chooses to use them',
    location: 'EE. UU.',
  },
] as const;

/** true mientras queden huecos por rellenar en LEGAL_IDENTITY. */
export function hasPendingFields(): boolean {
  return Object.values(LEGAL_IDENTITY).some(
    (v) => typeof v === 'string' && v.startsWith(PENDING_PREFIX)
  );
}

export function formattedLastUpdated(lang: string): string {
  const locale = lang === 'es' ? 'es-ES' : 'en-GB';
  return new Date(LEGAL_IDENTITY.lastUpdated).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
