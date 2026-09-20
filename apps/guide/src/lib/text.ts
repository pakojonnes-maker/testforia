// src/lib/text.ts — el contenido de una guía es TEXTO PLANO (apartment_info.content, sin markdown).
// Se parte en párrafos por las líneas en blanco, y si un párrafo empieza por un título numerado corto
// («1. Antes de salir») se enseña como título: así las guías escritas con esa costumbre salen ordenadas
// sin que el anfitrión tenga que aprender ningún formato.

export interface Paragraph {
  head: string | null;
  body: string;
}

export function paragraphs(content: string | null | undefined): Paragraph[] {
  const text = (content ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((p): Paragraph => {
      const lines = p.split('\n');
      if (lines.length > 1 && /^\d{1,2}[.)]\s+\S/.test(lines[0]) && lines[0].length <= 70) {
        return { head: lines[0].trim(), body: lines.slice(1).join('\n').trim() };
      }
      return { head: null, body: p.trim() };
    })
    .filter(p => p.head || p.body);
}

/**
 * Un importe con el formato de la moneda y del idioma: «38 €» y no «38,00 €» si es entero. Si el navegador no
 * conoce la moneda o el idioma, cae a «38.00 €» en vez de romper el pedido.
 */
export function formatMoney(amount: number, currency: string, lang: string): string {
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${!currency || currency === 'EUR' ? '€' : currency}`;
  }
}

/** Tamaño del código de entrada según su longitud: 4 cifras caben grandes; 6 u 8 no. */
export function codeSize(code: string): '' | 's' | 'xs' {
  const n = code.replace(/\s/g, '').length;
  return n <= 4 ? '' : n <= 6 ? 's' : 'xs';
}
