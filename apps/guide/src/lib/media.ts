// src/lib/media.ts — ayudas sobre las imágenes que llegan de la BD.
import type { PoiMedia } from './types';

// Algunas filas antiguas en la BD guardaron literalmente la URL de un
// placeholder externo (p.ej. el "No Image" que WelcomeHero usaba antes) como
// si fuera la imagen real del POI/plato. Tratarla como "sin imagen" evita
// mostrar ese placeholder ajeno — con su propio recorte inconsistente — en
// vez del nuestro (PhotoFigure: la forma con la inicial).
export function isRealImage(url?: string | null): url is string {
  return !!url && !url.includes('placehold.co');
}

/**
 * La foto con la que se pinta una experiencia. El worker manda dos campos independientes: `cover_image_url`
 * (la «Foto de portada» del formulario del catálogo) y `media` (la galería de guide_poi_media, donde sube el
 * admin cuando se añade una foto al sitio). Leer solo la portada dejaba sin foto a toda experiencia que solo
 * tiene galería, aunque Explorar sí la enseñara.
 *
 * Manda la portada, si la hay —igual que en la TV (photoSet), y así nada de lo que ya se veía cambia—. Si no,
 * la galería: la imagen principal o, a falta de ella, cualquier imagen (un vídeo o una miniatura no valen
 * para un <img>).
 */
export function experiencePhoto(exp: { cover_image_url?: string | null; media?: PoiMedia[] }): string | undefined {
  if (isRealImage(exp.cover_image_url)) return exp.cover_image_url;
  const images = (exp.media ?? []).filter(m => m.type === 'image' && isRealImage(m.url));
  return (images.find(m => m.role === 'PRIMARY_IMAGE') ?? images[0])?.url;
}
