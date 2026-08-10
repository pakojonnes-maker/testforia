// apps/admin/src/lib/guideApartmentTemplate.ts
//
// Plantilla de importación masiva de apartamentos (Excel/CSV). Este archivo
// es a la vez el GENERADOR de la plantilla (descargable desde el admin, con
// las zonas y categorías vivas del momento — nunca hardcoded, porque el
// catálogo cambia) y el PARSER de lo que la agencia devuelve. Las dos mitades
// comparten las mismas listas de columnas a propósito: si se añade una
// columna, generación y parseo se actualizan juntos en el mismo sitio.
//
// El resultado de parseApartmentImportFile() se manda tal cual al body de
// POST /guide/admin/import/apartments/preview (workerGuideApartmentImport.js)
// — la forma de ParsedApartmentRow tiene que coincidir con lo que ese
// endpoint espera por fila.
import * as XLSX from 'xlsx';

export interface TemplateZone { name: string }
export interface TemplateCategory { key: string; name: string; group_key?: string }

export interface ParsedApartmentInfoItem { category_key: string; text: string; custom_title?: string }
export interface ParsedApartmentPhoneItem { category_key: string; number: string }

export interface ParsedApartmentRow {
  row_number: number;
  name: string;
  address: string;
  zone_name: string;
  wifi_ssid: string;
  wifi_password: string;
  whatsapp: string;
  info: ParsedApartmentInfoItem[];
  phones: ParsedApartmentPhoneItem[];
}

export interface ParseResult {
  rows: ParsedApartmentRow[];
  parseErrors: string[];
}

// 10 de las ~58 categorías del catálogo global (migración 0083): las que en
// la práctica salen en casi todos los apartamentos, para que el caso normal
// se rellene en una sola hoja ancha. El resto del catálogo sigue disponible
// vía la hoja "Info extra" + la lista completa en "Ayuda".
export const WIDE_INFO_COLUMNS: { key: string; label: string }[] = [
  { key: 'checkin', label: 'Check-in' },
  { key: 'checkout', label: 'Check-out' },
  { key: 'parking', label: 'Parking' },
  { key: 'rules', label: 'Normas de la casa' },
  { key: 'trash', label: 'Basura' },
  { key: 'washing_machine', label: 'Lavadora' },
  { key: 'air_conditioning', label: 'Aire acondicionado' },
  { key: 'heating', label: 'Calefacción' },
  { key: 'tv', label: 'TV' },
  { key: 'host_contact', label: 'Contacto del anfitrión' },
];

const infoHeader = (label: string) => `Info: ${label}`;

const BASE_HEADERS = ['nombre*', 'direccion', 'zona*', 'wifi_ssid', 'wifi_password', 'whatsapp'];
const APARTMENTS_HEADERS = [...BASE_HEADERS, ...WIDE_INFO_COLUMNS.map(c => infoHeader(c.label))];
const INFO_EXTRA_HEADERS = ['apartamento*', 'categoria*', 'titulo_personalizado', 'texto*'];
const PHONES_HEADERS = ['apartamento*', 'categoria*', 'numero*'];

const SHEET_APARTMENTS = 'Apartamentos';
const SHEET_INFO_EXTRA = 'Info extra';
const SHEET_PHONES = 'Telefonos';
const SHEET_HELP = 'Ayuda';

// Nombre inequívoco a propósito: si la agencia olvida borrar la fila de
// ejemplo, aparece en la previsualización con un nombre que grita "esto no
// es un piso real" en vez de colarse como un apartamento más — el peor caso
// pasa a ser "descartar una fila de más en la revisión", no "piso fantasma
// en producción".
const EXAMPLE_NAME = 'EJEMPLO — BORRA ESTA FILA';

export function downloadApartmentImportTemplate(
  zones: TemplateZone[],
  infoCategories: TemplateCategory[],
  phoneCategories: TemplateCategory[],
) {
  const wb = XLSX.utils.book_new();

  const exampleAptRow = [
    EXAMPLE_NAME, 'Calle Larios 5, Marbella', zones[0]?.name || 'Marbella',
    'CasaSol_WiFi', 'sol12345', '+34600111222',
    'A partir de las 16h. El código del portal es 1234.',
    'Antes de las 11h, deja las llaves en la mesa.',
    'Plaza pública a 5 min, gratuita.',
    'No se admiten fiestas ni mascotas.',
    'Martes y viernes por la noche, contenedores en la esquina.',
    'Programa 30 min a 30 grados, detergente en el armario de la entrada.',
    'Mando en la mesita, no bajar de 24 grados.',
    'Radiadores eléctricos, interruptor en cada habitación.',
    'Netflix con sesión iniciada.',
    'María, +34600111222, disponible 9h-21h.',
  ];
  const apartmentsSheet = XLSX.utils.aoa_to_sheet([APARTMENTS_HEADERS, exampleAptRow]);
  XLSX.utils.book_append_sheet(wb, apartmentsSheet, SHEET_APARTMENTS);

  const infoExtraSheet = XLSX.utils.aoa_to_sheet([
    INFO_EXTRA_HEADERS,
    [EXAMPLE_NAME, 'pool', '', 'Piscina comunitaria en la azotea, abierta de 9h a 22h.'],
  ]);
  XLSX.utils.book_append_sheet(wb, infoExtraSheet, SHEET_INFO_EXTRA);

  const phonesSheet = XLSX.utils.aoa_to_sheet([
    PHONES_HEADERS,
    [EXAMPLE_NAME, 'agency', '+34600000000'],
  ]);
  XLSX.utils.book_append_sheet(wb, phonesSheet, SHEET_PHONES);

  const helpRows: (string | number)[][] = [
    ['Cómo rellenar esta plantilla'],
    ['1. Rellena la hoja "Apartamentos" — una fila por piso. Los campos con * son obligatorios. Borra la fila de ejemplo antes de enviar el archivo.'],
    ['2. La "zona" tiene que parecerse a una de la lista de abajo (no hace falta que sea exacto letra por letra).'],
    ['3. Las columnas "Info: ..." son opcionales — déjalas en blanco si no aplican a ese piso.'],
    ['4. Emergencias, policía, bomberos y ambulancia se añaden solos: no hace falta escribirlos en "Telefonos".'],
    ['5. Para información que no esté entre las columnas anchas (piscina, gimnasio, mascotas...), usa la hoja "Info extra" con la clave exacta de la lista de categorías de abajo.'],
    ['6. Si subes un .csv en vez de .xlsx, solo se lee la hoja principal (un csv no tiene varias hojas) — usa el .xlsx si necesitas "Info extra" o "Telefonos".'],
    [''],
    ['Zonas disponibles'],
    ['nombre'],
    ...zones.map(z => [z.name]),
    [''],
    ['Categorías de información (hoja "Info extra" y columnas "Info: ...")'],
    ['clave', 'nombre visible', 'grupo'],
    ...infoCategories.map(c => [c.key, c.name, c.group_key || '']),
    [''],
    ['Categorías de teléfono (hoja "Telefonos")'],
    ['clave', 'nombre visible'],
    ...phoneCategories.map(c => [c.key, c.name]),
  ];
  const helpSheet = XLSX.utils.aoa_to_sheet(helpRows);
  XLSX.utils.book_append_sheet(wb, helpSheet, SHEET_HELP);

  XLSX.writeFile(wb, 'visualtaste-plantilla-apartamentos.xlsx');
}

function normalizeKey(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

export async function parseApartmentImportFile(file: File): Promise<ParseResult> {
  const isCsv = file.name.toLowerCase().endsWith('.csv');
  const buf = await file.arrayBuffer();
  const wb = isCsv
    ? XLSX.read(new TextDecoder('utf-8').decode(buf), { type: 'string' })
    : XLSX.read(buf, { type: 'array' });

  const parseErrors: string[] = [];
  const findSheet = (name: string) =>
    wb.Sheets[wb.SheetNames.find(n => normalizeKey(n) === normalizeKey(name)) || ''];

  const apartmentsSheet = isCsv ? wb.Sheets[wb.SheetNames[0]] : findSheet(SHEET_APARTMENTS);
  if (!apartmentsSheet) {
    return { rows: [], parseErrors: [`No se encontró la hoja "${SHEET_APARTMENTS}" en el archivo.`] };
  }

  const aptJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(apartmentsSheet, { defval: '' });
  const rows: ParsedApartmentRow[] = [];
  const nameIndex = new Map<string, ParsedApartmentRow>();

  aptJson.forEach((raw, i) => {
    const name = cell(raw, 'nombre*', 'nombre');
    if (!name) return; // fila vacía / de relleno: se ignora sin avisar
    const rowNumber = i + 2; // +1 índice base 0, +1 por la fila de cabecera

    if (nameIndex.has(normalizeKey(name))) {
      parseErrors.push(`"${SHEET_APARTMENTS}" fila ${rowNumber}: nombre "${name}" repetido en el archivo — "Info extra"/"Telefonos" solo enlazarán con una de las dos filas.`);
    }

    const row: ParsedApartmentRow = {
      row_number: rowNumber,
      name,
      address: cell(raw, 'direccion'),
      zone_name: cell(raw, 'zona*', 'zona'),
      wifi_ssid: cell(raw, 'wifi_ssid'),
      wifi_password: cell(raw, 'wifi_password'),
      whatsapp: cell(raw, 'whatsapp'),
      info: [],
      phones: [],
    };
    for (const col of WIDE_INFO_COLUMNS) {
      const text = cell(raw, infoHeader(col.label));
      if (text) row.info.push({ category_key: col.key, text });
    }
    rows.push(row);
    nameIndex.set(normalizeKey(name), row);
  });

  // Un CSV no puede tener varias hojas — "Info extra"/"Telefonos" solo
  // existen en el .xlsx. No es un error, es una limitación del formato (ver
  // el aviso 6 de la hoja Ayuda).
  if (!isCsv) {
    const infoExtraSheet = findSheet(SHEET_INFO_EXTRA);
    if (infoExtraSheet) {
      const extraJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(infoExtraSheet, { defval: '' });
      extraJson.forEach((raw, i) => {
        const aptName = cell(raw, 'apartamento*', 'apartamento');
        const categoryKey = cell(raw, 'categoria*', 'categoria');
        const text = cell(raw, 'texto*', 'texto');
        if (!aptName && !categoryKey && !text) return; // fila vacía
        const rowNumber = i + 2;
        const target = nameIndex.get(normalizeKey(aptName));
        if (!target) {
          parseErrors.push(`"${SHEET_INFO_EXTRA}" fila ${rowNumber}: el apartamento "${aptName}" no está en la hoja "${SHEET_APARTMENTS}".`);
          return;
        }
        if (!categoryKey || !text) {
          parseErrors.push(`"${SHEET_INFO_EXTRA}" fila ${rowNumber}: faltan categoria o texto.`);
          return;
        }
        target.info.push({ category_key: categoryKey, text, custom_title: cell(raw, 'titulo_personalizado') || undefined });
      });
    }

    const phonesSheet = findSheet(SHEET_PHONES);
    if (phonesSheet) {
      const phonesJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(phonesSheet, { defval: '' });
      phonesJson.forEach((raw, i) => {
        const aptName = cell(raw, 'apartamento*', 'apartamento');
        const categoryKey = cell(raw, 'categoria*', 'categoria');
        const number = cell(raw, 'numero*', 'numero');
        if (!aptName && !categoryKey && !number) return;
        const rowNumber = i + 2;
        const target = nameIndex.get(normalizeKey(aptName));
        if (!target) {
          parseErrors.push(`"${SHEET_PHONES}" fila ${rowNumber}: el apartamento "${aptName}" no está en la hoja "${SHEET_APARTMENTS}".`);
          return;
        }
        if (!categoryKey || !number) {
          parseErrors.push(`"${SHEET_PHONES}" fila ${rowNumber}: faltan categoria o numero.`);
          return;
        }
        target.phones.push({ category_key: categoryKey, number });
      });
    }
  }

  return { rows, parseErrors };
}
