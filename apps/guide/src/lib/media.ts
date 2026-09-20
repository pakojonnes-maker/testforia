// src/lib/media.ts — ayudas sobre las imágenes que llegan de la BD.

// Algunas filas antiguas en la BD guardaron literalmente la URL de un
// placeholder externo (p.ej. el "No Image" que WelcomeHero usaba antes) como
// si fuera la imagen real del POI/plato. Tratarla como "sin imagen" evita
// mostrar ese placeholder ajeno — con su propio recorte inconsistente — en
// vez del nuestro (PhotoFigure: la forma con la inicial).
export function isRealImage(url?: string | null): url is string {
  return !!url && !url.includes('placehold.co');
}
