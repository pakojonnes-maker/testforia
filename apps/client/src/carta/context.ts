import { createContext, useContext } from 'react';
import type { CartItem } from '../hooks/useCart';
import type { CartaAllergen, CartaDish, CartaLanguage, CartaSection, FeedItem } from './model';
import type { T } from './strings';

export type View = 'reel' | 'ficha' | 'carta' | 'sel' | 'camarero' | 'casa' | 'idioma' | 'alergenos' | 'avisos';

export interface CasaAction {
  key: string;
  title: string;
  sub?: string;
  href?: string;
  onClick?: () => void;
}

export interface CartaCtx {
  t: T;
  lang: string;
  setLang: (code: string) => void;
  languages: CartaLanguage[];
  restaurant: { id: string; name: string; slug: string; logo_url?: string | null; cover_image_url?: string | null };
  sections: CartaSection[];
  items: FeedItem[];
  current: FeedItem;
  jumpTo: (index: number) => void;
  money: (n: number) => string;
  // pantallas
  view: View;
  open: (v: View) => void;
  back: () => void;
  closeAll: () => void;
  // me gusta
  isLiked: (id: string) => boolean;
  toggleLike: (dish: CartaDish) => void;
  likeCount: (dish: CartaDish) => number;
  likedDishes: FeedItem[];
  // alérgenos
  avoid: string[];
  toggleAvoid: (id: string) => void;
  avoidedIn: (dish: CartaDish) => CartaAllergen[];
  menuAllergens: CartaAllergen[];
  // pedido
  cart: CartItem[];
  addDish: (dish: CartaDish, portion: 'full' | 'half', qty: number) => void;
  setQty: (item: CartItem, qty: number) => void;
  cartCount: number;
  cartTotal: number;
  esName: (dishId: string, fallback: string) => string;
  esT: T;
  selTab: 'pedir' | 'gusta';
  setSelTab: (tab: 'pedir' | 'gusta') => void;
  // casa y avisos
  casaActions: CasaAction[];
  push: { supported: boolean; enabled: boolean; ios: boolean; enable: () => void; disable: () => void };
  privacyHref: string;
  toast: (msg: string) => void;
  plural: (n: number) => string;
}

export const Ctx = createContext<CartaCtx | null>(null);

export function useCarta(): CartaCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCarta fuera de la carta');
  return c;
}
