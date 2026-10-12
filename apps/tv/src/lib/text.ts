/**
 * Los «apartados» del texto de una guía: lo que separan las líneas en blanco.
 *
 * Es la misma regla que apps/guide/src/lib/text.ts (y apps/admin/src/lib/guideText.ts). Una foto
 * intercalada llega como «tras el apartado N» (`inline_media[].after`), así que las tres copias tienen
 * que contar igual: si cambias una, cambia las otras.
 *
 * Cada apartado se devuelve como sus líneas, que es como las pinta la tele (una por párrafo).
 */
export function textBlocks(content: string | null | undefined): string[][] {
  const text = (content ?? '').replace(/\r\n?/g, '\n').trim()
  if (!text) return []
  return text
    .split(/\n{2,}/)
    .map(block => block.split('\n').map(line => line.trim()).filter(Boolean))
    .filter(lines => lines.length > 0)
}
