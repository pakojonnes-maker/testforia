import React, { useEffect, useMemo, useState } from 'react';
import { getTranslation } from '../lib/i18n';
import { isRealImage } from './MediaPlaceholder';

type TabKey = 'info' | 'discover' | 'restaurants' | 'services' | 'chat';

interface StoreItem {
  id: string;
  name: string;
  category: string;
  price_display: string;
  cover_image_url?: string | null;
  is_featured: boolean;
  in_stock: boolean;
}

interface ProductBillboardProps {
  storeItems: StoreItem[];
  lang: string;
  onNavigateTab: (tab: TabKey) => void;
  onIntent: (type: 'product', id: string, action: string) => void;
}

// Cuánto se queda cada producto encendido, y cuánto dura el apagado antes del
// siguiente — la duración del apagado tiene que coincidir con la transición
// CSS de más abajo o el cambio de producto se ve a medio fundido.
const HOLD_MS = 4500;
const SWAP_MS = 320;

// "Valla publicitaria" (Stitch): franja oscura y compacta que se apaga y
// vuelve a encender con el siguiente producto — a diferencia de
// FeaturedCarousel (fotos grandes en cross-fade continuo, mezclando
// restaurantes/experiencias/productos), esta vive solo de la Tienda y replica
// el gesto de un panel de anuncios rotando, no un carrusel que siempre está
// "on". Un solo producto a la vez, sobre `on-background` (no `deep-sea`:
// GuidebookPage.tsx sobrescribe --color-deep-sea con el secondary_color de la
// agencia en runtime, que puede ser cualquier tono claro — on-background es
// el único oscuro garantizado, así la valla se distingue del crema del resto
// de la app pase lo que pase con la marca del anfitrión).
export default function ProductBillboard({ storeItems, lang, onNavigateTab, onIntent }: ProductBillboardProps) {
  const items = useMemo(() => {
    const featured = storeItems.filter(i => i.is_featured && i.in_stock);
    return featured.length > 0 ? featured : storeItems.filter(i => i.in_stock).slice(0, 4);
  }, [storeItems]);

  const [index, setIndex] = useState(0);
  const [lit, setLit] = useState(true);

  // Si cambia el catálogo (p.ej. cambio de idioma recarga los datos), vuelve
  // a empezar por el primero en vez de arriesgarse a un índice fuera de rango.
  useEffect(() => {
    setIndex(0);
    setLit(true);
  }, [items.length]);

  useEffect(() => {
    if (items.length < 2) return;
    const off = setTimeout(() => setLit(false), HOLD_MS);
    return () => clearTimeout(off);
  }, [index, items.length]);

  useEffect(() => {
    if (lit || items.length < 2) return;
    const next = setTimeout(() => {
      setIndex(i => (i + 1) % items.length);
      setLit(true);
    }, SWAP_MS);
    return () => clearTimeout(next);
  }, [lit, items.length]);

  if (items.length === 0) return null;
  const item = items[index];

  const handleTap = () => {
    onIntent('product', item.id, 'click_billboard');
    onNavigateTab('services');
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label={`${item.name} — ${getTranslation('tab_services', lang)}`}
      className="w-full bg-on-background text-crisp-white flex items-center gap-4 px-5 py-4 text-left overflow-hidden"
      style={{
        opacity: lit ? 1 : 0,
        transform: lit ? 'translateY(0)' : 'translateY(6px)',
        transition: `opacity ${SWAP_MS}ms ease, transform ${SWAP_MS}ms ease`,
      }}
    >
      <div className="w-12 h-12 shrink-0 flex items-center justify-center overflow-hidden border border-crisp-white/20 bg-crisp-white/10">
        {isRealImage(item.cover_image_url) ? (
          <img src={item.cover_image_url!} className="w-full h-full object-cover" alt="" />
        ) : (
          <span className="material-symbols-outlined text-crisp-white/50 text-[22px]" aria-hidden="true">shopping_bag</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="block font-label-caps text-label-caps uppercase text-accent-gold tracking-widest">
          {getTranslation('tab_services', lang)}
        </span>
        <span className="block font-headline-md text-[16px] truncate">{item.name}</span>
      </div>
      {item.price_display && (
        <span className="shrink-0 font-mono-badge text-mono-badge text-accent-gold">{item.price_display}</span>
      )}
      <span className="material-symbols-outlined text-crisp-white/70 shrink-0" aria-hidden="true">chevron_right</span>
    </button>
  );
}
