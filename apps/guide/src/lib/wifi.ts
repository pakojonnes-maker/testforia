// src/lib/wifi.ts — el WiFi de un piso llega como UN texto libre del anfitrión (apartment_info.content de la
// guía `wifi`). En producción hay al menos tres formas:
//
//   «Red: PalomaPark_5G\nContraseña: benalmadena2024#»
//   «Red: FincaAlboroto\nContraseña: alboroto2026\n\nCubre toda la casa… (una nota tras la línea en blanco)»
//   «Red: PisoPlaya2B / Contraseña: Burriana2024»          (todo en una línea)
//
// La tesela del diseño enseña cada «Etiqueta: valor» en su fila y la nota aparte. Si el texto no tiene esa
// forma, se enseña tal cual: nunca se pierde nada de lo que escribió el anfitrión.

export interface WifiRow {
  label: string;
  value: string;
}

export interface WifiParsed {
  rows: WifiRow[];
  /** Lo que no es «etiqueta: valor» (la nota tras la línea en blanco, o líneas sueltas). */
  note: string;
  /** Lo que se copia al pulsar Copiar: la contraseña (última fila) si hay dos filas; el texto entero si no se sabe. */
  copyValue: string;
}

const PAIR = /^\s*([^:：\n]{1,32}?)\s*[:：]\s*(\S.*?)\s*$/;

export function parseWifi(content: string | null | undefined): WifiParsed {
  const text = (content ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return { rows: [], note: '', copyValue: '' };

  const [block, ...rest] = text.split(/\n[ \t]*\n/);
  const rows: WifiRow[] = [];
  const loose: string[] = [];
  for (const line of block.split('\n')) {
    for (const part of line.split(/\s+[/|·]\s+/)) {
      const m = part.match(PAIR);
      if (m) rows.push({ label: m[1].trim(), value: m[2].trim() });
      else if (part.trim()) loose.push(part.trim());
    }
  }

  // Sin ninguna pareja «etiqueta: valor»: texto libre, tal cual.
  if (rows.length === 0) return { rows: [], note: text, copyValue: text };

  const note = [...loose, ...rest.map(r => r.trim())].filter(Boolean).join('\n\n');
  const copyValue = rows.length === 2 ? rows[1].value : rows.length === 1 ? rows[0].value : text;
  return { rows, note, copyValue };
}
