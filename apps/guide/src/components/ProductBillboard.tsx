import React, { useMemo } from 'react';

type TabKey = 'info' | 'discover' | 'restaurants' | 'services' | 'chat';

interface StoreItem {
  id: string;
  name: string;
  price_display: string;
  is_featured: boolean;
  in_stock: boolean;
}

interface ProductBillboardProps {
  storeItems: StoreItem[];
  onNavigateTab: (tab: TabKey) => void;
  onIntent: (type: 'product', id: string, action: string) => void;
}

// "Valla publicitaria" (Stitch): cinta gris a sangre con texto azul en
// mayúsculas desplazándose en bucle continuo — el mismo mecanismo que el
// ticker de la landing (.animate-marquee / @keyframes marquee-scroll,
// index.css), reutilizado aquí con productos reales en vez del texto de
// ciudad/región de la maqueta. Reemplaza el primer intento (tarjeta oscura
// que se apagaba/encendía con un solo producto): visualmente no se parecía
// en nada a la referencia — Stitch es una cinta continua, no un aviso que
// aparece y desaparece.
//
// -mx-[20px] md:-mx-[64px] rompe el margen del <main> a propósito: en el
// diseño es la única franja que llega de canto a canto, no una tarjeta más
// dentro del margen de página (esos 20px/64px son --spacing-margin-mobile/
// desktop en index.css, el mismo padding horizontal que usa <main>).
export default function ProductBillboard({ storeItems, onNavigateTab, onIntent }: ProductBillboardProps) {
  const items = useMemo(
    () => {
      const featured = storeItems.filter(i => i.is_featured && i.in_stock);
      return featured.length > 0 ? featured : storeItems.filter(i => i.in_stock);
    },
    [storeItems],
  );

  if (items.length === 0) return null;

  const handleTap = (item: StoreItem) => {
    onIntent('product', item.id, 'click_billboard');
    onNavigateTab('services');
  };

  // Nombre · precio como un único token pulsable, con un "•" fijo (no
  // pulsable) detrás de cada uno — incluido el último, para que el punto de
  // unión entre las dos copias del track (necesario para el bucle sin
  // costuras de translateX(-50%)) mantenga el mismo ritmo que el resto.
  const track = (
    <div className="flex shrink-0 items-center">
      {items.map(item => (
        <React.Fragment key={item.id}>
          <button
            type="button"
            onClick={() => handleTap(item)}
            className="shrink-0 font-label-caps text-label-caps uppercase tracking-[0.15em] text-primary whitespace-nowrap"
          >
            {item.name}
            {item.price_display && <span className="text-primary/60"> · {item.price_display}</span>}
          </button>
          <span className="shrink-0 px-3 text-primary/40" aria-hidden="true">•</span>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="-mx-[20px] md:-mx-[64px] overflow-hidden border-y border-on-background/10 bg-surface-dim py-3">
      <div className="flex w-max animate-marquee">
        {track}
        {track}
      </div>
    </div>
  );
}
