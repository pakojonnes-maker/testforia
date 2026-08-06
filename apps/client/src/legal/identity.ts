// Identidad legal del prestador del servicio.
//
// ⚠️ GEMELO: apps/guide/src/lib/legalIdentity.ts tiene los MISMOS valores. Si
// cambias uno, cambia el otro. No se ha extraído a un paquete compartido porque
// client (Emotion) y guide (Tailwind v4) no comparten hoy ninguna dependencia de
// workspace, y añadir una obligaría a tocar el build de las dos apps para 20
// líneas de constantes que cambian una vez cada varios años.
//
// Los valores marcados como PENDIENTE son obligatorios por el art. 10 LSSI y el
// art. 13 RGPD: sin ellos, las páginas legales NO cumplen. `hasPendingFields()`
// los detecta y la página legal pinta un aviso bien visible mientras falten.

const PENDING_PREFIX = '⚠️ PENDIENTE';

export const LEGAL_IDENTITY = {
  /** Nombre comercial. Este sí es correcto. */
  brand: 'VisualTaste',

  /** Denominación social completa (p. ej. "Visualtaste Studios, S.L." o el nombre y apellidos si operas como autónomo). */
  companyName: `${PENDING_PREFIX}: razón social`,

  /** NIF/CIF. Obligatorio (art. 10.1.a LSSI). */
  taxId: `${PENDING_PREFIX}: NIF`,

  /** Domicilio social completo con código postal. Obligatorio (art. 10.1.a LSSI). */
  address: `${PENDING_PREFIX}: domicilio social`,

  /** Datos registrales. Solo si estás inscrito en el Registro Mercantil (no aplica a autónomos: deja null). */
  registryData: null as string | null,

  /** Contacto general. Este ya se usa en la landing del guidebook. */
  contactEmail: 'info@visualtastes.com',

  /**
   * Buzón para ejercer derechos RGPD. Crea el alias antes de publicar: el art. 12.2
   * obliga a FACILITAR el ejercicio de derechos, y la política anterior apuntaba a
   * legal@visualtaste.app — dominio distinto del real (visualtastes.com), o sea, una
   * dirección que rebota.
   */
  privacyEmail: 'privacidad@visualtastes.com',

  /** Dominios propios del servicio. */
  domains: {
    main: 'visualtastes.com',
    menu: 'menu.visualtastes.com',
    guide: 'guide.visualtastes.com',
    admin: 'admin.visualtastes.com',
  },

  /**
   * Fecha de la última revisión de los textos legales. Actualízala a mano cuando
   * cambies el contenido — `new Date()` mostraría la fecha de HOY en cada visita,
   * que es justo lo contrario de lo que un texto legal debe acreditar.
   */
  lastUpdated: '2026-08-03',

  /** Autoridad de control competente en España. */
  supervisoryAuthority: {
    name: 'Agencia Española de Protección de Datos (AEPD)',
    url: 'https://www.aepd.es',
  },
} as const;

/** Encargados y proveedores con acceso a datos. Debe estar publicado (art. 13.1.e RGPD). */
export const SUBPROCESSORS = [
  {
    name: 'Cloudflare, Inc.',
    purpose: 'Alojamiento, base de datos (D1), almacenamiento de medios (R2), caché (KV) y asistente de IA (Workers AI)',
    location: 'EE. UU. / red global',
  },
  {
    name: 'Resend',
    purpose: 'Envío de correos transaccionales (invitaciones, recuperación de contraseña)',
    location: 'EE. UU.',
  },
  {
    name: 'Google LLC',
    purpose: 'Datos de establecimientos (Google Places) y tipografías web',
    location: 'EE. UU.',
  },
  {
    name: 'Meta Platforms, Inc.',
    purpose: 'Enlaces de contacto por WhatsApp cuando el usuario decide usarlos',
    location: 'EE. UU.',
  },
] as const;

/** true mientras queden huecos por rellenar en LEGAL_IDENTITY. */
export function hasPendingFields(): boolean {
  return Object.values(LEGAL_IDENTITY).some(
    (v) => typeof v === 'string' && v.startsWith(PENDING_PREFIX)
  );
}

export const formattedLastUpdated = () =>
  new Date(LEGAL_IDENTITY.lastUpdated).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
