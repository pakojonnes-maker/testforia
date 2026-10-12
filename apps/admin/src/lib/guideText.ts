// Los «apartados» del texto de una guía, tal como los ve el huésped.
//
// Es la misma regla que apps/guide/src/lib/text.ts (y apps/tv/src/lib/text.ts): el texto se parte por las
// líneas en blanco. Una foto intercalada se guarda como «tras el apartado N» (migración 0107), así que las
// tres copias tienen que contar igual: si cambias una, cambia las otras.

export interface GuideBlock {
  /** 1 = el primero. Es lo que se guarda en guide_apartment_media.after_block. */
  position: number;
  /** Cómo reconocerlo en un desplegable: su título numerado o el arranque del párrafo. */
  label: string;
}

const LABEL_MAX = 42;

export function guideBlocks(content: string | null | undefined): GuideBlock[] {
  const text = (content ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map((p, i) => {
      const first = p.split('\n')[0].trim();
      return { position: i + 1, label: first.length > LABEL_MAX ? `${first.slice(0, LABEL_MAX).trimEnd()}…` : first };
    });
}
