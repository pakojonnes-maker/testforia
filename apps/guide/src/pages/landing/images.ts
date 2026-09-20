// Fotos de serie de la landing: las mismas que usan apps/tv y apps/tv-landing.
// Vite les añade hash al nombre, así que se sirven con caché larga y se invalidan solas al cambiarlas.
import background from './img/background.webp';
import doPhoto from './img/do.webp';
import eat from './img/eat.webp';
import info from './img/info.webp';
import lang from './img/lang.webp';
import stay from './img/stay.webp';
import store from './img/store.webp';
import wifi from './img/wifi.webp';

export const IMG = { background, do: doPhoto, eat, info, lang, stay, store, wifi } as const;
export type ImgKey = keyof typeof IMG;
