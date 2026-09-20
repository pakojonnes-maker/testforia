import { useMemo } from 'react';
import { getTranslation } from '../lib/i18n';
import { isRealImage } from './MediaPlaceholder';

type TabKey = 'info' | 'discover' | 'restaurants' | 'services' | 'chat';

interface StoreItem {
  id: string;
  name: string;
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

// Al final de Casa: una tarjeta grande que lleva a la Tienda. Antes era una cinta gris que desplazaba sin
// parar los nombres de los productos; ahora es una tarjeta de foto (la del primer producto destacado) con
// el título de la tienda y un botón. Sin foto, se pinta con el color primario de la agencia.
export default function ProductBillboard({ storeItems, lang, onNavigateTab, onIntent }: ProductBillboardProps) {
  const first = useMemo(() => {
    const featured = storeItems.filter(i => i.is_featured && i.in_stock);
    const pool = featured.length > 0 ? featured : storeItems.filter(i => i.in_stock);
    return pool.find(i => isRealImage(i.cover_image_url)) ?? pool[0];
  }, [storeItems]);

  if (!first) return null;

  const photo = isRealImage(first.cover_image_url);
  const open = () => {
    onIntent('product', first.id, 'click_billboard');
    onNavigateTab('services');
  };

  return (
    <section className={`g-promo${photo ? '' : ' plain'}`}>
      {photo && <img src={first.cover_image_url as string} alt="" loading="lazy" decoding="async" />}
      {photo && <span className="g-veil" />}
      <div className="g-promo-in">
        <h2 className="g-h2">{getTranslation('store_title', lang)}</h2>
        <p>{getTranslation('store_subtitle', lang)}</p>
      </div>
      <button type="button" className={`g-pill ${photo ? 'light' : 'inv-fill'}`} onClick={open}>
        {getTranslation('view_store', lang)}
      </button>
    </section>
  );
}
